//go:build windows

package main

import (
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

// ==================== LUMA OS 1.6.6: WIN32 LUMASHIELD 3.0 HELPERS (ZERO NewCallback!) ====================

var (
	hcKernel32DLL               = syscall.NewLazyDLL("kernel32.dll")
	procHcGetLogicalDriveStrW   = hcKernel32DLL.NewProc("GetLogicalDriveStringsW")
	procHcGetDriveTypeW         = hcKernel32DLL.NewProc("GetDriveTypeW")
	procHcGetVolumeInfoW        = hcKernel32DLL.NewProc("GetVolumeInformationW")
	procHcSetFileAttributesW    = hcKernel32DLL.NewProc("SetFileAttributesW")
	procHcCreateToolhelp32Snap  = hcKernel32DLL.NewProc("CreateToolhelp32Snapshot")
	procHcProcess32FirstW       = hcKernel32DLL.NewProc("Process32FirstW")
	procHcProcess32NextW        = hcKernel32DLL.NewProc("Process32NextW")
	procHcOpenProcess           = hcKernel32DLL.NewProc("OpenProcess")
	procHcQueryFullProcessImgW  = hcKernel32DLL.NewProc("QueryFullProcessImageNameW")
	procHcTerminateProcess      = hcKernel32DLL.NewProc("TerminateProcess")
	procHcCloseHandle           = hcKernel32DLL.NewProc("CloseHandle")
)

const (
	hcDriveRemovable        = 2
	hcFileAttrNormal        = 0x80
	hcTh32csSnapProcess     = 0x00000002
	hcProcQueryLimitedInfo  = 0x1000
	hcProcTerminate         = 0x0001
)

type hcProcessEntry32W struct {
	DwSize              uint32
	CntUsage            uint32
	Th32ProcessID       uint32
	Th32DefaultHeapID   uintptr
	Th32ModuleID        uint32
	CntThreads          uint32
	Th32ParentProcessID uint32
	PcPriClassBase      int32
	DwFlags             uint32
	SzExeFile           [260]uint16
}

func listRemovableDrives() []UsbDriveInfo {
	var buf [512]uint16
	n, _, _ := procHcGetLogicalDriveStrW.Call(uintptr(len(buf)-1), uintptr(unsafe.Pointer(&buf[0])))
	if n == 0 || n >= uintptr(len(buf)) {
		return nil
	}
	var out []UsbDriveInfo
	start := 0
	for i := 0; i < int(n); i++ {
		if buf[i] == 0 {
			if i > start {
				root := syscall.UTF16ToString(buf[start:i])
				rootPtr, err := syscall.UTF16PtrFromString(root)
				if err == nil {
					dt, _, _ := procHcGetDriveTypeW.Call(uintptr(unsafe.Pointer(rootPtr)))
					if dt == hcDriveRemovable {
						var volBuf [128]uint16
						_, _, _ = procHcGetVolumeInfoW.Call(
							uintptr(unsafe.Pointer(rootPtr)),
							uintptr(unsafe.Pointer(&volBuf[0])),
							uintptr(len(volBuf)),
							0, 0, 0, 0, 0,
						)
						lbl := syscall.UTF16ToString(volBuf[:])
						if lbl == "" {
							lbl = "USB-накопитель"
						}
						out = append(out, UsbDriveInfo{
							Path:  root,
							Label: lbl,
						})
					}
				}
			}
			start = i + 1
		}
	}
	return out
}

func stripWindowsFileAttributes(path string) {
	u16, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return
	}
	_, _, _ = procHcSetFileAttributesW.Call(uintptr(unsafe.Pointer(u16)), hcFileAttrNormal)
}

// hasMarkOfTheWeb checks Windows NTFS Alternate Data Stream (:Zone.Identifier) for ZoneId=3/4 (foreign downloaded file).
func hasMarkOfTheWeb(path string) bool {
	ads := path + ":Zone.Identifier"
	raw, err := os.ReadFile(ads)
	if err != nil {
		return false
	}
	s := strings.ToLower(string(raw))
	return strings.Contains(s, "zoneid=3") || strings.Contains(s, "zoneid=4")
}

func queryProcessImagePath(pid uint32) string {
	h, _, _ := procHcOpenProcess.Call(hcProcQueryLimitedInfo, 0, uintptr(pid))
	if h == 0 {
		return ""
	}
	defer procHcCloseHandle.Call(h)
	var buf [520]uint16
	sz := uint32(len(buf))
	r, _, _ := procHcQueryFullProcessImgW.Call(h, 0, uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&sz)))
	if r == 0 || sz == 0 {
		return ""
	}
	return syscall.UTF16ToString(buf[:sz])
}

func killProcessByPID(pid int) bool {
	if pid <= 4 || pid == os.Getpid() {
		return false
	}
	h, _, _ := procHcOpenProcess.Call(hcProcTerminate, 0, uintptr(pid))
	if h == 0 {
		return false
	}
	defer procHcCloseHandle.Call(h)
	r, _, _ := procHcTerminateProcess.Call(h, 1)
	return r != 0
}

func killProcessByPath(targetPath string) int {
	absTarget, err := filepath.Abs(targetPath)
	if err != nil {
		absTarget = targetPath
	}
	targetLow := strings.ToLower(filepath.Clean(absTarget))
	myPID := uint32(os.Getpid())

	snap, _, _ := procHcCreateToolhelp32Snap.Call(hcTh32csSnapProcess, 0)
	if snap == 0 || snap == ^uintptr(0) {
		return 0
	}
	defer procHcCloseHandle.Call(snap)

	var pe hcProcessEntry32W
	pe.DwSize = uint32(unsafe.Sizeof(pe))
	r, _, _ := procHcProcess32FirstW.Call(snap, uintptr(unsafe.Pointer(&pe)))
	killed := 0
	for r != 0 {
		if pe.Th32ProcessID > 4 && pe.Th32ProcessID != myPID {
			name := syscall.UTF16ToString(pe.SzExeFile[:])
			if !isProtectedCoreProcess(name) {
				img := queryProcessImagePath(pe.Th32ProcessID)
				if img != "" && strings.ToLower(filepath.Clean(img)) == targetLow {
					if killProcessByPID(int(pe.Th32ProcessID)) {
						killed++
					}
				}
			}
		}
		r, _, _ = procHcProcess32NextW.Call(snap, uintptr(unsafe.Pointer(&pe)))
	}
	return killed
}

var knownRatProcessNames = []string{
	"asyncrat", "njrat", "quasarrat", "quasar.client", "remcos", "darkcomet",
	"nanocore", "dcrat", "venomrat", "xworm", "orcus", "warzone", "agenttesla",
	"gh0st", "meterpreter", "nc.exe", "ncat.exe", "keylogger", "ratserver", "ratclient",
}

func scanSuspiciousRemoteProcesses() []suspiciousProcHit {
	snap, _, _ := procHcCreateToolhelp32Snap.Call(hcTh32csSnapProcess, 0)
	if snap == 0 || snap == ^uintptr(0) {
		return nil
	}
	defer procHcCloseHandle.Call(snap)

	myPID := uint32(os.Getpid())
	usbDrives := listRemovableDrives()
	var hits []suspiciousProcHit

	var pe hcProcessEntry32W
	pe.DwSize = uint32(unsafe.Sizeof(pe))
	r, _, _ := procHcProcess32FirstW.Call(snap, uintptr(unsafe.Pointer(&pe)))
	for r != 0 {
		if pe.Th32ProcessID > 4 && pe.Th32ProcessID != myPID {
			name := syscall.UTF16ToString(pe.SzExeFile[:])
			lowName := strings.ToLower(name)
			if !isProtectedCoreProcess(name) {
				img := queryProcessImagePath(pe.Th32ProcessID)
				matchedReason := ""
				for _, kw := range knownRatProcessNames {
					if strings.Contains(lowName, kw) {
						matchedReason = "Обнаружен активный RAT-процесс удалённого управления (" + name + ")"
						break
					}
				}
				if matchedReason == "" && img != "" {
					imgLow := strings.ToLower(img)
					// Check if running directly from a removable USB drive
					for _, drv := range usbDrives {
						if strings.HasPrefix(imgLow, strings.ToLower(drv.Path)) {
							if info, err := os.Stat(img); err == nil {
								if isRC, _, _, rsn := analyzeRemoteControlThreat(img, info, true); isRC {
									matchedReason = "Вредоносный процесс запущен с USB-флешки: " + rsn
								}
							}
							break
						}
					}
				}
				if matchedReason != "" {
					hits = append(hits, suspiciousProcHit{
						PID:    int(pe.Th32ProcessID),
						Name:   name,
						Path:   img,
						Reason: matchedReason,
					})
				}
			}
		}
		r, _, _ = procHcProcess32NextW.Call(snap, uintptr(unsafe.Pointer(&pe)))
	}
	return hits
}
