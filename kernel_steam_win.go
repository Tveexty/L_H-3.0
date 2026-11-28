//go:build windows

package main

import (
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

// ==================== LUMA OS 1.8.3: WINDOWS NATIVE STEAM REGISTRY & STEAM.EXE LIVE I/O COUNTERS ====================

var (
	steamAdvapi32DLL       = syscall.NewLazyDLL("advapi32.dll")
	procSteamRegOpenKeyExW = steamAdvapi32DLL.NewProc("RegOpenKeyExW")
	procSteamRegQueryValW  = steamAdvapi32DLL.NewProc("RegQueryValueExW")
	procSteamRegEnumKeyExW = steamAdvapi32DLL.NewProc("RegEnumKeyExW")
	procSteamRegCloseKey   = steamAdvapi32DLL.NewProc("RegCloseKey")

	steamKernel32DLL           = syscall.NewLazyDLL("kernel32.dll")
	procSteamCreateToolhelp32  = steamKernel32DLL.NewProc("CreateToolhelp32Snapshot")
	procSteamProcess32FirstW   = steamKernel32DLL.NewProc("Process32FirstW")
	procSteamProcess32NextW    = steamKernel32DLL.NewProc("Process32NextW")
	procSteamOpenProcess       = steamKernel32DLL.NewProc("OpenProcess")
	procSteamCloseHandle       = steamKernel32DLL.NewProc("CloseHandle")
	procSteamGetProcessIOCntrs = steamKernel32DLL.NewProc("GetProcessIoCounters")
)

const (
	steamHKEYCurrentUser    = uintptr(0x80000001)
	steamHKEYLocalMachine   = uintptr(0x80000002)
	steamKeyRead            = uintptr(0x20019)
	steamSnapProcess        = uintptr(0x00000002)
	steamProcQueryLimInfo   = uintptr(0x1000)
)

type steamWinIOCounters struct {
	ReadOperationCount  uint64
	WriteOperationCount uint64
	OtherOperationCount uint64
	ReadTransferCount   uint64
	WriteTransferCount  uint64
	OtherTransferCount  uint64
}

type steamWinProcessEntry32W struct {
	Size              uint32
	CntUsage          uint32
	ProcessID         uint32
	_                 uint32
	DefaultHeapID     uintptr
	ModuleID          uint32
	CntThreads        uint32
	ParentProcessID   uint32
	PriClassBase      int32
	Flags             uint32
	ExeFile           [260]uint16
}

func steamRegReadString(root uintptr, subkey, valueName string) string {
	subPtr, err := syscall.UTF16PtrFromString(subkey)
	if err != nil {
		return ""
	}
	var hKey uintptr
	if r, _, _ := procSteamRegOpenKeyExW.Call(root, uintptr(unsafe.Pointer(subPtr)), 0, steamKeyRead, uintptr(unsafe.Pointer(&hKey))); r != 0 || hKey == 0 {
		return ""
	}
	defer procSteamRegCloseKey.Call(hKey)

	valPtr, err := syscall.UTF16PtrFromString(valueName)
	if err != nil {
		return ""
	}
	var valType uint32
	buf := make([]uint16, 512)
	bufBytes := uint32(len(buf) * 2)
	if r, _, _ := procSteamRegQueryValW.Call(
		hKey,
		uintptr(unsafe.Pointer(valPtr)),
		0,
		uintptr(unsafe.Pointer(&valType)),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(unsafe.Pointer(&bufBytes)),
	); r != 0 {
		return ""
	}
	return strings.TrimSpace(syscall.UTF16ToString(buf))
}

func steamRegReadDWORD(hKey uintptr, valueName string) (uint32, bool) {
	valPtr, err := syscall.UTF16PtrFromString(valueName)
	if err != nil {
		return 0, false
	}
	var valType uint32
	var val uint32
	sz := uint32(4)
	if r, _, _ := procSteamRegQueryValW.Call(
		hKey,
		uintptr(unsafe.Pointer(valPtr)),
		0,
		uintptr(unsafe.Pointer(&valType)),
		uintptr(unsafe.Pointer(&val)),
		uintptr(unsafe.Pointer(&sz)),
	); r != 0 {
		return 0, false
	}
	return val, true
}

func steamRegReadSubString(hKey uintptr, valueName string) string {
	valPtr, err := syscall.UTF16PtrFromString(valueName)
	if err != nil {
		return ""
	}
	var valType uint32
	buf := make([]uint16, 256)
	sz := uint32(len(buf) * 2)
	if r, _, _ := procSteamRegQueryValW.Call(
		hKey,
		uintptr(unsafe.Pointer(valPtr)),
		0,
		uintptr(unsafe.Pointer(&valType)),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(unsafe.Pointer(&sz)),
	); r != 0 {
		return ""
	}
	return strings.TrimSpace(syscall.UTF16ToString(buf))
}

// getSteamInstallRootsNative reads real Steam install paths directly from Windows Registry (<0.1ms).
func getSteamInstallRootsNative() []string {
	var out []string
	candidates := []struct {
		root uintptr
		key  string
		val  string
	}{
		{steamHKEYCurrentUser, `Software\Valve\Steam`, "SteamPath"},
		{steamHKEYCurrentUser, `Software\Valve\Steam`, "SteamExe"},
		{steamHKEYLocalMachine, `SOFTWARE\WOW6432Node\Valve\Steam`, "InstallPath"},
		{steamHKEYLocalMachine, `SOFTWARE\Valve\Steam`, "InstallPath"},
	}
	for _, c := range candidates {
		v := steamRegReadString(c.root, c.key, c.val)
		if v == "" {
			continue
		}
		v = strings.ReplaceAll(v, "/", `\`)
		if strings.HasSuffix(strings.ToLower(v), ".exe") {
			v = filepath.Dir(v)
		}
		out = append(out, filepath.Clean(v))
	}
	return out
}

// getSteamUpdatingAppsFromRegistry enumerates HKCU\Software\Valve\Steam\Apps for instant (<1s) Updating=1/0 flags!
func getSteamUpdatingAppsFromRegistry() map[string]steamRegAppState {
	res := map[string]steamRegAppState{}
	subPtr, err := syscall.UTF16PtrFromString(`Software\Valve\Steam\Apps`)
	if err != nil {
		return res
	}
	var hApps uintptr
	if r, _, _ := procSteamRegOpenKeyExW.Call(steamHKEYCurrentUser, uintptr(unsafe.Pointer(subPtr)), 0, steamKeyRead, uintptr(unsafe.Pointer(&hApps))); r != 0 || hApps == 0 {
		return res
	}
	defer procSteamRegCloseKey.Call(hApps)

	nameBuf := make([]uint16, 128)
	for idx := uint32(0); idx < 2048; idx++ {
		nameLen := uint32(len(nameBuf))
		r, _, _ := procSteamRegEnumKeyExW.Call(
			hApps,
			uintptr(idx),
			uintptr(unsafe.Pointer(&nameBuf[0])),
			uintptr(unsafe.Pointer(&nameLen)),
			0, 0, 0, 0,
		)
		if r != 0 {
			break
		}
		appID := strings.TrimSpace(syscall.UTF16ToString(nameBuf[:nameLen]))
		if appID == "" {
			continue
		}
		appPtr, err := syscall.UTF16PtrFromString(appID)
		if err != nil {
			continue
		}
		var hApp uintptr
		if r2, _, _ := procSteamRegOpenKeyExW.Call(hApps, uintptr(unsafe.Pointer(appPtr)), 0, steamKeyRead, uintptr(unsafe.Pointer(&hApp))); r2 != 0 || hApp == 0 {
			continue
		}
		upd, hasUpd := steamRegReadDWORD(hApp, "Updating")
		appName := steamRegReadSubString(hApp, "Name")
		procSteamRegCloseKey.Call(hApp)

		if hasUpd {
			res[appID] = steamRegAppState{
				AppID:    appID,
				Name:     appName,
				Updating: upd != 0,
			}
		}
	}
	return res
}

// getSteamProcessIOCountersNative reads real-time Win32 IO_COUNTERS for steam.exe (zero admin needed, <0.2ms).
// WriteTransferCount measures ONLY actual bytes written to disk (never sparse preallocation!), giving exact live progress!
func getSteamProcessIOCountersNative() (pid uint32, readBytes uint64, writeBytes uint64, otherBytes uint64, ok bool) {
	hSnap, _, _ := procSteamCreateToolhelp32.Call(steamSnapProcess, 0)
	if hSnap == 0 || hSnap == ^uintptr(0) {
		return 0, 0, 0, 0, false
	}
	defer procSteamCloseHandle.Call(hSnap)

	var pe steamWinProcessEntry32W
	pe.Size = uint32(unsafe.Sizeof(pe))
	r, _, _ := procSteamProcess32FirstW.Call(hSnap, uintptr(unsafe.Pointer(&pe)))
	for r != 0 {
		exe := strings.ToLower(syscall.UTF16ToString(pe.ExeFile[:]))
		if exe == "steam.exe" {
			hProc, _, _ := procSteamOpenProcess.Call(steamProcQueryLimInfo, 0, uintptr(pe.ProcessID))
			if hProc != 0 {
				var ioCnt steamWinIOCounters
				okIO, _, _ := procSteamGetProcessIOCntrs.Call(hProc, uintptr(unsafe.Pointer(&ioCnt)))
				procSteamCloseHandle.Call(hProc)
				if okIO != 0 {
					return pe.ProcessID, ioCnt.ReadTransferCount, ioCnt.WriteTransferCount, ioCnt.OtherTransferCount, true
				}
			}
		}
		r, _, _ = procSteamProcess32NextW.Call(hSnap, uintptr(unsafe.Pointer(&pe)))
	}
	return 0, 0, 0, 0, false
}
