//go:build windows

package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"math"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

var (
	modShell32                       = syscall.NewLazyDLL("shell32.dll")
	modOle32                         = syscall.NewLazyDLL("ole32.dll")
	modGdi32                         = syscall.NewLazyDLL("gdi32.dll")
	modHid                           = syscall.NewLazyDLL("hid.dll")
	modPdh                           = syscall.NewLazyDLL("pdh.dll")
	procSHGetFileInfoW               = modShell32.NewProc("SHGetFileInfoW")
	procExtractIconExW               = modShell32.NewProc("ExtractIconExW")
	procSHEmptyRecycleBinW           = modShell32.NewProc("SHEmptyRecycleBinW")
	procCoInitializeEx               = modOle32.NewProc("CoInitializeEx")
	procCoUninitialize               = modOle32.NewProc("CoUninitialize")
	procGetIconInfo                  = modUser32.NewProc("GetIconInfo")
	procDestroyIcon                  = modUser32.NewProc("DestroyIcon")
	procProGetDC                     = modUser32.NewProc("GetDC")
	procProReleaseDC                 = modUser32.NewProc("ReleaseDC")
	procProGetSystemMetrics          = modUser32.NewProc("GetSystemMetrics")
	procProGetGUIThreadInfo          = modUser32.NewProc("GetGUIThreadInfo")
	procProAllowSetFg                = modUser32.NewProc("AllowSetForegroundWindow")
	procProSetFg                     = modUser32.NewProc("SetForegroundWindow")
	procProBringToTop                = modUser32.NewProc("BringWindowToTop")
	procProShowWindow                = modUser32.NewProc("ShowWindow")
	procProSetWindowPos              = modUser32.NewProc("SetWindowPos")
	procProEnumWindows               = modUser32.NewProc("EnumWindows")
	procProIsWindowVisible           = modUser32.NewProc("IsWindowVisible")
	procProGetWindowTextLenW         = modUser32.NewProc("GetWindowTextLengthW")
	procCreateCompatibleDC           = modGdi32.NewProc("CreateCompatibleDC")
	procCreateCompatibleBitmap       = modGdi32.NewProc("CreateCompatibleBitmap")
	procSelectObject                 = modGdi32.NewProc("SelectObject")
	procBitBlt                       = modGdi32.NewProc("BitBlt")
	procDeleteDC                     = modGdi32.NewProc("DeleteDC")
	procGetDIBits                    = modGdi32.NewProc("GetDIBits")
	procDeleteObject                 = modGdi32.NewProc("DeleteObject")
	procGetObjectW                   = modGdi32.NewProc("GetObjectW")
	procGetExtendedTcpTable          = modIphlpapi.NewProc("GetExtendedTcpTable")
	procHidDGetHidGuid               = modHid.NewProc("HidD_GetHidGuid")
	procHidDGetProductString         = modHid.NewProc("HidD_GetProductString")
	procHidDGetManufacturerString    = modHid.NewProc("HidD_GetManufacturerString")
	procHidDGetAttributes            = modHid.NewProc("HidD_GetAttributes")
	procHidDGetPreparsedData         = modHid.NewProc("HidD_GetPreparsedData")
	procHidDFreePreparsedData        = modHid.NewProc("HidD_FreePreparsedData")
	procHidPGetCaps                  = modHid.NewProc("HidP_GetCaps")
	procHidPGetValueCaps             = modHid.NewProc("HidP_GetValueCaps")
	procHidDGetFeature               = modHid.NewProc("HidD_GetFeature")
	procHidDSetFeature               = modHid.NewProc("HidD_SetFeature")
	procHidDSetOutputReport          = modHid.NewProc("HidD_SetOutputReport")
	procHidDGetInputReport           = modHid.NewProc("HidD_GetInputReport")
	procProSystemParametersInfoW     = modUser32.NewProc("SystemParametersInfoW")
	procSetupDiEnumDeviceInterfaces  = modSetupapi.NewProc("SetupDiEnumDeviceInterfaces")
	procSetupDiGetDeviceIntfDetailW  = modSetupapi.NewProc("SetupDiGetDeviceInterfaceDetailW")
	procPdhOpenQueryW                = modPdh.NewProc("PdhOpenQueryW")
	procPdhAddEnglishCounterW        = modPdh.NewProc("PdhAddEnglishCounterW")
	procPdhCollectQueryData          = modPdh.NewProc("PdhCollectQueryData")
	procPdhGetFormattedCounterArrayW = modPdh.NewProc("PdhGetFormattedCounterArrayW")
)

const (
	shgfiIcon            = 0x000000100
	shgfiLargeIcon       = 0x000000000
	dibRGBColors         = 0
	biRGB                = 0
	digcfDeviceInterface = 0x00000010
	tcpTableOwnerPidAll  = 5
	afInet               = 2
	pdhFmtDouble         = 0x00000200
)

var (
	devpkeyDeviceContainerID = devPropKey{
		FmtID: windowsGUID{0x8C7ED206, 0x3F8A, 0x4827, [8]byte{0xB3, 0xAB, 0xAE, 0x9E, 0x1F, 0xAE, 0xFC, 0x6C}},
		PID:   2,
	}
	devpkeyBusReportedDesc = devPropKey{
		FmtID: windowsGUID{0x540B947E, 0x8B40, 0x45BC, [8]byte{0xA8, 0xA2, 0x6A, 0x0B, 0x89, 0x4C, 0xBD, 0xA2}},
		PID:   4,
	}
)

// ==================== 1. DIRECT HARDWARE GPU CHIP % + VRAM (NVML + PDH + REGISTRY, ZERO WMI!) ====================

type nvmlUtilization struct {
	GPU    uint32
	Memory uint32
}

type nvmlMemory struct {
	Total uint64
	Free  uint64
	Used  uint64
}

type gpuNativeReader struct {
	once          sync.Once
	nvmlReady     bool
	nvmlDev       uintptr
	procUtil      *syscall.LazyProc
	procMem       *syscall.LazyProc
	procTemp      *syscall.LazyProc
	pdhReady      bool
	pdhQuery      uintptr
	pdhEngineCnt  uintptr
	pdhVramCnt    uintptr
	regVramTotalM int
}

var globalGpuReader gpuNativeReader

func readWinRegQwordOrDword(root syscall.Handle, subKey, valName string) uint64 {
	sk, err := syscall.UTF16PtrFromString(subKey)
	if err != nil {
		return 0
	}
	var hKey syscall.Handle
	if syscall.RegOpenKeyEx(root, sk, 0, syscall.KEY_READ, &hKey) != nil {
		return 0
	}
	defer syscall.RegCloseKey(hKey)
	vn, err := syscall.UTF16PtrFromString(valName)
	if err != nil {
		return 0
	}
	var valType uint32
	var buf [8]byte
	bufLen := uint32(len(buf))
	if syscall.RegQueryValueEx(hKey, vn, nil, &valType, &buf[0], &bufLen) != nil {
		return 0
	}
	if valType == syscall.REG_QWORD && bufLen >= 8 {
		return binary.LittleEndian.Uint64(buf[:8])
	}
	if valType == syscall.REG_DWORD && bufLen >= 4 {
		return uint64(binary.LittleEndian.Uint32(buf[:4]))
	}
	if valType == syscall.REG_BINARY && bufLen >= 4 {
		if bufLen >= 8 {
			return binary.LittleEndian.Uint64(buf[:8])
		}
		return uint64(binary.LittleEndian.Uint32(buf[:4]))
	}
	return 0
}

func (g *gpuNativeReader) init() {
	g.once.Do(func() {
		// Read fallback total VRAM from Display Adapter Registry (0.1ms, ZERO WMI!)
		for idx := 0; idx < 4; idx++ {
			sub := fmt.Sprintf(`SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\%04d`, idx)
			qw := readWinRegQwordOrDword(syscall.HKEY_LOCAL_MACHINE, sub, "HardwareInformation.qwMemorySize")
			if qw == 0 {
				qw = readWinRegQwordOrDword(syscall.HKEY_LOCAL_MACHINE, sub, "HardwareInformation.MemorySize")
			}
			mb := int(qw / (1024 * 1024))
			if mb > g.regVramTotalM && mb <= 131072 {
				g.regVramTotalM = mb
			}
		}

		// Layer 1: Try NVIDIA NVML directly (50 microseconds, exact Chip %, VRAM Used/Total, Temp °C!)
		nvPaths := []string{
			"nvml.dll",
			`C:\Windows\System32\nvml.dll`,
			`C:\Program Files\NVIDIA Corporation\NVSMI\nvml.dll`,
		}
		for _, pth := range nvPaths {
			dll := syscall.NewLazyDLL(pth)
			if dll.Load() != nil {
				continue
			}
			pInit := dll.NewProc("nvmlInit_v2")
			pGetDev := dll.NewProc("nvmlDeviceGetHandleByIndex_v2")
			pUtil := dll.NewProc("nvmlDeviceGetUtilizationRates")
			pMem := dll.NewProc("nvmlDeviceGetMemoryInfo")
			pTemp := dll.NewProc("nvmlDeviceGetTemperature")
			if pInit.Find() == nil && pGetDev.Find() == nil && pUtil.Find() == nil && pMem.Find() == nil {
				r, _, _ := pInit.Call()
				if r == 0 {
					var dev uintptr
					r2, _, _ := pGetDev.Call(0, uintptr(unsafe.Pointer(&dev)))
					if r2 == 0 && dev != 0 {
						g.nvmlReady = true
						g.nvmlDev = dev
						g.procUtil = pUtil
						g.procMem = pMem
						g.procTemp = pTemp
						return
					}
				}
			}
		}

		// Layer 2: Universal Windows PDH GPU Counters (AMD / Intel / Any DirectX 12 GPU, ZERO WMI!)
		if modPdh.Load() == nil && procPdhOpenQueryW.Find() == nil {
			var q uintptr
			r, _, _ := procPdhOpenQueryW.Call(0, 0, uintptr(unsafe.Pointer(&q)))
			if r == 0 && q != 0 {
				var cEng, cMem uintptr
				pEng, _ := syscall.UTF16PtrFromString(`\GPU Engine(*)\Utilization Percentage`)
				pMem, _ := syscall.UTF16PtrFromString(`\GPU Adapter Memory(*)\Dedicated Usage`)
				r1, _, _ := procPdhAddEnglishCounterW.Call(q, uintptr(unsafe.Pointer(pEng)), 0, uintptr(unsafe.Pointer(&cEng)))
				r2, _, _ := procPdhAddEnglishCounterW.Call(q, uintptr(unsafe.Pointer(pMem)), 0, uintptr(unsafe.Pointer(&cMem)))
				if r1 == 0 || r2 == 0 {
					_, _, _ = procPdhCollectQueryData.Call(q)
					g.pdhReady = true
					g.pdhQuery = q
					g.pdhEngineCnt = cEng
					g.pdhVramCnt = cMem
				}
			}
		}
	})
}

type pdhFmtCounterItemDouble struct {
	SzName   *uint16
	CStatus  uint32
	_pad     uint32
	DoubleV  float64
}

func readPdhSumDouble(counter uintptr) (float64, bool) {
	if counter == 0 {
		return 0, false
	}
	var bufSize, itemCount uint32
	_, _, _ = procPdhGetFormattedCounterArrayW.Call(
		counter,
		pdhFmtDouble,
		uintptr(unsafe.Pointer(&bufSize)),
		uintptr(unsafe.Pointer(&itemCount)),
		0,
	)
	if bufSize == 0 || itemCount == 0 || bufSize > 2*1024*1024 {
		return 0, false
	}
	buf := make([]byte, bufSize)
	r, _, _ := procPdhGetFormattedCounterArrayW.Call(
		counter,
		pdhFmtDouble,
		uintptr(unsafe.Pointer(&bufSize)),
		uintptr(unsafe.Pointer(&itemCount)),
		uintptr(unsafe.Pointer(&buf[0])),
	)
	if r != 0 {
		return 0, false
	}
	stride := unsafe.Sizeof(pdhFmtCounterItemDouble{})
	sum := 0.0
	for i := uint32(0); i < itemCount; i++ {
		off := uintptr(i) * stride
		if off+stride > uintptr(len(buf)) {
			break
		}
		item := (*pdhFmtCounterItemDouble)(unsafe.Pointer(&buf[off]))
		if item.CStatus == 0 && !math.IsNaN(item.DoubleV) && item.DoubleV > 0 {
			sum += item.DoubleV
		}
	}
	return sum, true
}

func (p *platformProbe) sampleGpuTelemetryNative() {
	globalGpuReader.init()

	if globalGpuReader.nvmlReady {
		var util nvmlUtilization
		var mem nvmlMemory
		var temp uint32
		rU, _, _ := globalGpuReader.procUtil.Call(globalGpuReader.nvmlDev, uintptr(unsafe.Pointer(&util)))
		rM, _, _ := globalGpuReader.procMem.Call(globalGpuReader.nvmlDev, uintptr(unsafe.Pointer(&mem)))
		if globalGpuReader.procTemp != nil && globalGpuReader.procTemp.Find() == nil {
			_, _, _ = globalGpuReader.procTemp.Call(globalGpuReader.nvmlDev, 0, uintptr(unsafe.Pointer(&temp)))
		}
		p.mu.Lock()
		if rU == 0 {
			pct := int(util.GPU)
			if pct > 100 {
				pct = 100
			}
			p.gpuPercent = pct
			p.gpuSource = "NVIDIA NVML Direct"
		}
		if rM == 0 && mem.Total > 0 {
			p.gpuVramTotalMB = int(mem.Total / (1024 * 1024))
			p.gpuVramUsedMB = int(mem.Used / (1024 * 1024))
			vp := int(math.Round(float64(mem.Used) * 100.0 / float64(mem.Total)))
			if vp > 100 {
				vp = 100
			}
			p.gpuVramPercent = vp
		}
		if temp > 10 && temp < 120 {
			p.gpuTempC = int(temp)
		}
		p.mu.Unlock()
		return
	}

	if globalGpuReader.pdhReady && globalGpuReader.pdhQuery != 0 {
		r, _, _ := procPdhCollectQueryData.Call(globalGpuReader.pdhQuery)
		if r == 0 {
			engSum, okEng := readPdhSumDouble(globalGpuReader.pdhEngineCnt)
			memBytes, okMem := readPdhSumDouble(globalGpuReader.pdhVramCnt)
			p.mu.Lock()
			if okEng {
				pct := int(math.Round(engSum))
				if pct > 100 {
					pct = 100
				}
				if pct < 0 {
					pct = 0
				}
				p.gpuPercent = pct
				p.gpuSource = "Win32 PDH GPU Engine"
			}
			if globalGpuReader.regVramTotalM > 0 {
				p.gpuVramTotalMB = globalGpuReader.regVramTotalM
			}
			if okMem && memBytes >= 0 {
				usedMB := int(memBytes / (1024 * 1024))
				p.gpuVramUsedMB = usedMB
				if p.gpuVramTotalMB > 0 {
					vp := int(math.Round(float64(usedMB) * 100.0 / float64(p.gpuVramTotalMB)))
					if vp > 100 {
						vp = 100
					}
					p.gpuVramPercent = vp
				}
			}
			p.mu.Unlock()
			return
		}
	}

	// Graceful fallback if neither NVML nor PDH counters exist
	p.mu.Lock()
	if globalGpuReader.regVramTotalM > 0 && p.gpuVramTotalMB == 0 {
		p.gpuVramTotalMB = globalGpuReader.regVramTotalM
	}
	if p.gpuSource == "" {
		p.gpuSource = "Win32 Display HAL"
	}
	p.mu.Unlock()
}

// ==================== 2. REAL-TIME ADAPTIVE KEYBOARD LAYOUT MONITOR (4 MICROSECONDS, 0% CPU!) ====================

type winGuiThreadInfo struct {
	CbSize        uint32
	Flags         uint32
	HwndActive    uintptr
	HwndFocus     uintptr
	HwndCapture   uintptr
	HwndMenuOwner uintptr
	HwndMoveSize  uintptr
	HwndCaret     uintptr
	RcCaret       winRect
}

func readActiveWin32KeyboardFast() (string, string) {
	var tid uintptr
	var gti winGuiThreadInfo
	gti.CbSize = uint32(unsafe.Sizeof(gti))
	if r, _, _ := procProGetGUIThreadInfo.Call(0, uintptr(unsafe.Pointer(&gti))); r != 0 {
		target := gti.HwndFocus
		if target == 0 {
			target = gti.HwndActive
		}
		if target != 0 {
			tid, _, _ = procGetWindowThreadProcessId.Call(target, 0)
		}
	}
	if tid == 0 {
		hwnd, _, _ := procGetForegroundWindow.Call()
		if hwnd != 0 {
			tid, _, _ = procGetWindowThreadProcessId.Call(hwnd, 0)
		}
	}
	hkl, _, _ := procGetKeyboardLayout.Call(tid)
	tag := winTagFromHKL(hkl)
	if tag == "" {
		return "", ""
	}
	return tag, keyboardShortCode(tag)
}

func (p *platformProbe) pollActiveKbdFast() {
	tag, short := readActiveWin32KeyboardFast()
	if tag == "" {
		return
	}
	p.mu.Lock()
	p.activeKbdTag = tag
	p.activeKbdShort = short
	p.mu.Unlock()
}

// ==================== 3. PURE WIN32 APP ICON EXTRACTOR (SHGetFileInfoW -> PNG, ZERO POWERSHELL!) ====================

type shFileInfoW struct {
	HIcon         uintptr
	IIcon         int32
	DwAttributes  uint32
	SzDisplayName [260]uint16
	SzTypeName    [80]uint16
}

type winIconInfo struct {
	FIcon    int32
	XHotspot uint32
	YHotspot uint32
	HbmMask  uintptr
	HbmColor uintptr
}

type winBitmap struct {
	BmType       int32
	BmWidth      int32
	BmHeight     int32
	BmWidthBytes int32
	BmPlanes     uint16
	BmBitsPixel  uint16
	BmBits       uintptr
}

type bitmapInfoHeader struct {
	BiSize          uint32
	BiWidth         int32
	BiHeight        int32
	BiPlanes        uint16
	BiBitCount      uint16
	BiCompression   uint32
	BiSizeImage     uint32
	BiXPelsPerMeter int32
	BiYPelsPerMeter int32
	BiClrUsed       uint32
	BiClrImportant  uint32
}

var (
	iconCacheMu sync.RWMutex
	iconCache   = map[string][]byte{}
)

func buildAppIconURL(execPath string) string {
	clean := strings.TrimSpace(strings.Trim(execPath, `"`))
	if clean == "" {
		return ""
	}
	return "/api/kernel/app-icon?path=" + url.QueryEscape(clean)
}

func expandWinEnvVars(s string) string {
	repls := []string{
		"%SystemRoot%", os.Getenv("SystemRoot"),
		"%SYSTEMROOT%", os.Getenv("SystemRoot"),
		"%windir%", os.Getenv("WINDIR"),
		"%WINDIR%", os.Getenv("WINDIR"),
		"%ProgramFiles%", os.Getenv("ProgramFiles"),
		"%ProgramFiles(x86)%", os.Getenv("ProgramFiles(x86)"),
		"%LocalAppData%", os.Getenv("LOCALAPPDATA"),
		"%LOCALAPPDATA%", os.Getenv("LOCALAPPDATA"),
		"%AppData%", os.Getenv("APPDATA"),
		"%APPDATA%", os.Getenv("APPDATA"),
	}
	out := s
	for i := 0; i < len(repls); i += 2 {
		if repls[i+1] != "" && strings.Contains(out, repls[i]) {
			out = strings.ReplaceAll(out, repls[i], repls[i+1])
		}
	}
	return out
}

func resolveAppIconFilePath(raw string) string {
	clean := strings.TrimSpace(strings.Trim(raw, `"`))
	if clean == "" {
		return ""
	}
	// Strip ",0" or ",-101" resource index suffixes from DisplayIcon registry values
	if comma := strings.LastIndex(clean, ","); comma > 2 {
		clean = strings.TrimSpace(strings.Trim(clean[:comma], `"`))
	}
	clean = expandWinEnvVars(clean)
	if _, err := os.Stat(clean); err == nil {
		return clean
	}

	// Normalize bare app aliases / names to real Windows executables
	lower := strings.ToLower(strings.TrimSuffix(filepath.Base(clean), ".exe"))
	aliasMap := map[string][]string{
		"chrome":         {"chrome.exe", `Google\Chrome\Application\chrome.exe`},
		"google chrome":  {"chrome.exe", `Google\Chrome\Application\chrome.exe`},
		"edge":           {"msedge.exe", `Microsoft\Edge\Application\msedge.exe`},
		"msedge":         {"msedge.exe", `Microsoft\Edge\Application\msedge.exe`},
		"firefox":        {"firefox.exe", `Mozilla Firefox\firefox.exe`},
		"opera":          {"opera.exe", `Programs\Opera\opera.exe`, `Programs\Opera GX\opera.exe`},
		"brave":          {"brave.exe", `BraveSoftware\Brave-Browser\Application\brave.exe`},
		"yandex":         {"browser.exe", `Yandex\YandexBrowser\Application\browser.exe`},
		"steam":          {"steam.exe", `Steam\steam.exe`},
		"telegram":       {"Telegram.exe", `Telegram Desktop\Telegram.exe`},
		"discord":        {"Discord.exe", `Discord\Update.exe`},
		"vlc":            {"vlc.exe", `VideoLAN\VLC\vlc.exe`},
		"code":           {"Code.exe", `Programs\Microsoft VS Code\Code.exe`, `Microsoft VS Code\Code.exe`},
		"vscode":         {"Code.exe", `Programs\Microsoft VS Code\Code.exe`, `Microsoft VS Code\Code.exe`},
		"spotify":        {"Spotify.exe", `Spotify\Spotify.exe`},
		"notion":         {"Notion.exe", `Programs\Notion\Notion.exe`},
		"github":         {"GitHubDesktop.exe", `GitHubDesktop\GitHubDesktop.exe`},
		"obsidian":       {"Obsidian.exe", `Obsidian\Obsidian.exe`},
		"winword":        {"WINWORD.EXE", `Microsoft Office\root\Office16\WINWORD.EXE`, `Microsoft Office\Office16\WINWORD.EXE`},
		"excel":          {"EXCEL.EXE", `Microsoft Office\root\Office16\EXCEL.EXE`, `Microsoft Office\Office16\EXCEL.EXE`},
		"powerpnt":       {"POWERPNT.EXE", `Microsoft Office\root\Office16\POWERPNT.EXE`, `Microsoft Office\Office16\POWERPNT.EXE`},
		"calc":           {"calc.exe"},
		"калькулятор":    {"calc.exe"},
		"notepad":        {"notepad.exe"},
		"блокнот":        {"notepad.exe"},
		"mspaint":        {"mspaint.exe"},
		"paint":          {"mspaint.exe"},
		"explorer":       {"explorer.exe"},
		"проводник":      {"explorer.exe"},
		"cmd":            {"cmd.exe"},
		"wt":             {"wt.exe"},
		"powershell":     {"powershell.exe"},
		"taskmgr":        {"Taskmgr.exe"},
		"regedit":        {"regedit.exe"},
		"snippingtool":   {"SnippingTool.exe"},
		"obs":            {"obs64.exe", `obs-studio\bin\64bit\obs64.exe`},
		"qbittorrent":    {"qbittorrent.exe", `qBittorrent\qbittorrent.exe`},
		"7zfm":           {"7zFM.exe", `7-Zip\7zFM.exe`},
		"winrar":         {"WinRAR.exe", `WinRAR\WinRAR.exe`},
	}

	candidates := []string{}
	if list, ok := aliasMap[lower]; ok {
		candidates = append(candidates, list...)
	} else {
		exeName := clean
		if !strings.HasSuffix(strings.ToLower(exeName), ".exe") && !strings.ContainsAny(exeName, `\/`) {
			exeName += ".exe"
		}
		candidates = append(candidates, exeName)
	}

	sysRoot := os.Getenv("SystemRoot")
	if sysRoot == "" {
		sysRoot = `C:\Windows`
	}
	roots := []string{
		filepath.Join(sysRoot, "System32"),
		sysRoot,
		os.Getenv("ProgramFiles"),
		os.Getenv("ProgramFiles(x86)"),
		os.Getenv("LOCALAPPDATA"),
		os.Getenv("APPDATA"),
	}

	// Special scan for versioned Discord app-* directory
	if lower == "discord" {
		if matches, err := filepath.Glob(filepath.Join(os.Getenv("LOCALAPPDATA"), "Discord", "app-*", "Discord.exe")); err == nil && len(matches) > 0 {
			return matches[len(matches)-1]
		}
	}

	for _, cand := range candidates {
		if !strings.ContainsAny(cand, `\/`) {
			if p, err := exec.LookPath(cand); err == nil {
				return p
			}
			// Check Windows Registry App Paths (pure Win32 Advapi32, 0% WMI!)
			for _, hive := range []syscall.Handle{syscall.HKEY_LOCAL_MACHINE, syscall.HKEY_CURRENT_USER} {
				if p := readWinRegString(hive, `SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\`+cand, ""); p != "" {
					p = expandWinEnvVars(strings.Trim(strings.TrimSpace(p), `"`))
					if _, err := os.Stat(p); err == nil {
						return p
					}
				}
			}
		}
		for _, r := range roots {
			if r == "" {
				continue
			}
			full := filepath.Join(r, cand)
			if _, err := os.Stat(full); err == nil {
				return full
			}
		}
	}
	return ""
}

// ExtractAppIconPNG extracts the crisp 32x32 native Windows icon of any .exe/.lnk/preinstalled app as PNG (~1ms, cached in RAM!).
func (p *platformProbe) ExtractAppIconPNG(execPath string) ([]byte, error) {
	rawClean := strings.TrimSpace(strings.Trim(execPath, `"`))
	if rawClean == "" {
		return nil, fmt.Errorf("empty path")
	}
	cacheKey := strings.ToLower(rawClean)
	iconCacheMu.RLock()
	if cached, ok := iconCache[cacheKey]; ok {
		iconCacheMu.RUnlock()
		return cached, nil
	}
	iconCacheMu.RUnlock()

	clean := resolveAppIconFilePath(rawClean)
	useFileAttrs := false
	if clean == "" {
		// If it's a file extension (e.g. ".pdf", "report.docx"), extract the OS shell association icon via SHGFI_USEFILEATTRIBUTES!
		if ext := filepath.Ext(rawClean); ext != "" && !strings.EqualFold(ext, ".exe") {
			clean = rawClean
			useFileAttrs = true
		} else {
			return nil, fmt.Errorf("icon file not found for %s", rawClean)
		}
	}
	pathPtr, err := syscall.UTF16PtrFromString(clean)
	if err != nil {
		return nil, err
	}

	// MSDN requires STA COM initialization on the calling OS thread so SHGetFileInfoW NEVER randomly fails!
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	const coinitApartmentThreaded = 0x2
	hr, _, _ := procCoInitializeEx.Call(0, coinitApartmentThreaded)
	if hr == 0 || hr == 1 {
		defer procCoUninitialize.Call()
	}

	const (
		shgfiUseFileAttributes = 0x00000010
		fileAttributeNormal    = 0x00000080
	)
	flags := uintptr(shgfiIcon | shgfiLargeIcon)
	attrs := uintptr(0)
	if useFileAttrs {
		flags |= shgfiUseFileAttributes
		attrs = fileAttributeNormal
	}

	var hIcon uintptr
	var sfi shFileInfoW
	r, _, _ := procSHGetFileInfoW.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		attrs,
		uintptr(unsafe.Pointer(&sfi)),
		unsafe.Sizeof(sfi),
		flags,
	)
	if r != 0 && sfi.HIcon != 0 {
		hIcon = sfi.HIcon
	}
	if hIcon == 0 && !useFileAttrs {
		// Direct ExtractIconExW fallback for executables/DLLs whose shell thumbnail handler skipped SHGetFileInfoW
		var largeIcon uintptr
		cnt, _, _ := procExtractIconExW.Call(uintptr(unsafe.Pointer(pathPtr)), 0, uintptr(unsafe.Pointer(&largeIcon)), 0, 1)
		if cnt > 0 && largeIcon != 0 {
			hIcon = largeIcon
		}
	}
	if hIcon == 0 {
		return nil, fmt.Errorf("icon extraction failed for %s", clean)
	}
	defer procDestroyIcon.Call(hIcon)

	var ii winIconInfo
	r2, _, _ := procGetIconInfo.Call(hIcon, uintptr(unsafe.Pointer(&ii)))
	if r2 == 0 {
		return nil, fmt.Errorf("GetIconInfo failed")
	}
	if ii.HbmMask != 0 {
		defer procDeleteObject.Call(ii.HbmMask)
	}
	if ii.HbmColor == 0 {
		return nil, fmt.Errorf("no color bitmap")
	}
	defer procDeleteObject.Call(ii.HbmColor)

	var bm winBitmap
	_, _, _ = procGetObjectW.Call(ii.HbmColor, unsafe.Sizeof(bm), uintptr(unsafe.Pointer(&bm)))
	w := int(bm.BmWidth)
	h := int(bm.BmHeight)
	if w <= 0 || h <= 0 || w > 256 || h > 256 {
		w, h = 32, 32
	}

	hdc, _, _ := procCreateCompatibleDC.Call(0)
	if hdc == 0 {
		return nil, fmt.Errorf("CreateCompatibleDC failed")
	}
	defer procDeleteDC.Call(hdc)

	var bih bitmapInfoHeader
	bih.BiSize = uint32(unsafe.Sizeof(bih))
	bih.BiWidth = int32(w)
	bih.BiHeight = -int32(h) // top-down DIB!
	bih.BiPlanes = 1
	bih.BiBitCount = 32
	bih.BiCompression = biRGB

	pixels := make([]byte, w*h*4)
	lines, _, _ := procGetDIBits.Call(
		hdc,
		ii.HbmColor,
		0,
		uintptr(h),
		uintptr(unsafe.Pointer(&pixels[0])),
		uintptr(unsafe.Pointer(&bih)),
		dibRGBColors,
	)
	if lines == 0 {
		return nil, fmt.Errorf("GetDIBits failed")
	}

	hasAlpha := false
	for i := 3; i < len(pixels); i += 4 {
		if pixels[i] != 0 {
			hasAlpha = true
			break
		}
	}

	// If legacy icon has no alpha channel, extract transparency cleanly from HbmMask!
	var maskPixels []byte
	if !hasAlpha && ii.HbmMask != 0 {
		maskPixels = make([]byte, w*h*4)
		_, _, _ = procGetDIBits.Call(
			hdc,
			ii.HbmMask,
			0,
			uintptr(h),
			uintptr(unsafe.Pointer(&maskPixels[0])),
			uintptr(unsafe.Pointer(&bih)),
			dibRGBColors,
		)
	}

	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			off := (y*w + x) * 4
			b, g, rr, a := pixels[off], pixels[off+1], pixels[off+2], pixels[off+3]
			if !hasAlpha {
				if len(maskPixels) == len(pixels) {
					// In Win32 icon mask, white (255) = transparent, black (0) = opaque
					if maskPixels[off] == 0 {
						a = 255
					} else {
						a = 0
					}
				} else if rr != 0 || g != 0 || b != 0 {
					a = 255
				}
			}
			img.Pix[off] = rr
			img.Pix[off+1] = g
			img.Pix[off+2] = b
			img.Pix[off+3] = a
		}
	}

	var out bytes.Buffer
	if err := png.Encode(&out, img); err != nil {
		return nil, err
	}
	data := out.Bytes()

	iconCacheMu.Lock()
	if len(iconCache) >= 320 {
		iconCache = map[string][]byte{}
	}
	iconCache[cacheKey] = data
	iconCacheMu.Unlock()
	return data, nil
}

// ==================== 4. 2.4GHz RADIO-CHANNEL (HID + CONTAINER + VENDOR) BATTERY ENGINE ====================

type spDeviceInterfaceData struct {
	CbSize             uint32
	InterfaceClassGuid windowsGUID
	Flags              uint32
	Reserved           uintptr
}

type hidAttributes struct {
	Size          uint32
	VendorID      uint16
	ProductID     uint16
	VersionNumber uint16
}

type hidCaps struct {
	Usage                     uint16
	UsagePage                 uint16
	InputReportByteLength     uint16
	OutputReportByteLength    uint16
	FeatureReportByteLength   uint16
	Reserved                  [17]uint16
	NumberLinkCollectionNodes uint16
	NumberInputButtonCaps     uint16
	NumberInputValueCaps      uint16
	NumberInputDataIndices    uint16
	NumberOutputButtonCaps    uint16
	NumberOutputValueCaps     uint16
	NumberOutputDataIndices   uint16
	NumberFeatureButtonCaps   uint16
	NumberFeatureValueCaps    uint16
	NumberFeatureDataIndices  uint16
}

type hidValueCaps struct {
	UsagePage         uint16
	ReportID          byte
	IsAlias           byte
	BitField          uint16
	LinkCollection    uint16
	LinkUsage         uint16
	LinkUsagePage     uint16
	IsRange           byte
	IsStringRange     byte
	IsDesignatorRange byte
	IsAbsolute        byte
	HasNull           byte
	Reserved          byte
	BitSize           uint16
	ReportCount       uint16
	Reserved2         [5]uint16
	UnitsExp          uint32
	Units             uint32
	LogicalMin        int32
	LogicalMax        int32
	PhysicalMin       int32
	PhysicalMax       int32
	UsageMin          uint16
	UsageMax          uint16
	StringMin         uint16
	StringMax         uint16
	DesignatorMin     uint16
	DesignatorMax     uint16
	DataIndexMin      uint16
	DataIndexMax      uint16
}

func readSetupDiGUIDProp(hDevInfo uintptr, devInfo *spDevInfoData, key *devPropKey) string {
	var propType uint32
	var g windowsGUID
	var reqSize uint32
	r, _, _ := procSetupDiGetDevicePropertyW.Call(
		hDevInfo,
		uintptr(unsafe.Pointer(devInfo)),
		uintptr(unsafe.Pointer(key)),
		uintptr(unsafe.Pointer(&propType)),
		uintptr(unsafe.Pointer(&g)),
		unsafe.Sizeof(g),
		uintptr(unsafe.Pointer(&reqSize)),
		0,
	)
	if r == 0 || (g.Data1 == 0 && g.Data2 == 0 && g.Data3 == 0) {
		return ""
	}
	return fmt.Sprintf("%08x-%04x-%04x-%x", g.Data1, g.Data2, g.Data3, g.Data4)
}

func isGenericHIDName(name string) bool {
	low := strings.ToLower(strings.TrimSpace(name))
	if low == "" {
		return true
	}
	generic := []string{
		"hid-compliant", "usb input device", "usb composite", "hid keyboard",
		"hid mouse", "hid-совместим", "устройство ввода usb", "составное usb",
		"bluetooth low energy gatt", "device information", "battery service",
	}
	for _, g := range generic {
		if strings.HasPrefix(low, g) || low == g {
			return true
		}
	}
	return false
}

func knownWirelessVendorName(vid uint16) string {
	switch vid {
	case 0x046D:
		return "Logitech"
	case 0x1532:
		return "Razer"
	case 0x1038:
		return "SteelSeries"
	case 0x0951, 0x03F0:
		return "HyperX"
	case 0x1B1C:
		return "Corsair"
	case 0x0B05:
		return "ASUS ROG"
	case 0x045E:
		return "Microsoft / Xbox"
	case 0x054C:
		return "Sony"
	case 0x05AC:
		return "Apple"
	case 0x258A:
		return "Glorious / Wireless"
	case 0x3710:
		return "Pulsar"
	case 0x3151:
		return "Ajazz"
	case 0x1D57:
		return "Attack Shark / Compx"
	case 0x3554:
		return "IO / Ajazz / Ardor / Compx"
	case 0x25A7:
		return "Ardor / Redragon / Compx 2.4GHz"
	case 0x2FE9:
		return "VGN / ATK"
	case 0x373B:
		return "Attack Shark / 2.4GHz"
	case 0x1EA7:
		return "2.4GHz Wireless"
	case 0x248A:
		return "Maxxter / 2.4GHz Wireless"
	case 0x09DA:
		return "A4Tech / Bloody"
	case 0x320F:
		return "ATK / Ardor / Wireless"
	case 0x3434:
		return "Keychron"
	case 0x2516:
		return "Cooler Master"
	case 0x1E7D, 0x10F5:
		return "Roccat / Turtle Beach"
	case 0x3367:
		return "Endgame Gear"
	case 0x04A5:
		return "Zowie / BenQ"
	case 0x413C:
		return "Dell"
	case 0x17EF:
		return "Lenovo"
	case 0x2717:
		return "Xiaomi"
	case 0x2B89:
		return "Ugreen"
	case 0x3199:
		return "Baseus"
	case 0x291A:
		return "Anker / Soundcore"
	case 0x0ECB:
		return "JBL / Harman"
	case 0x05A7:
		return "Bose"
	case 0x1395:
		return "Sennheiser / EPOS"
	case 0x0B0E:
		return "Jabra"
	case 0x145F:
		return "Trust"
	case 0x0C45:
		return "Ajazz / Redragon / Wireless"
	case 0x1A2C, 0x1915, 0x062A, 0x1BCF, 0x30FA, 0x2588, 0x18F8:
		return "2.4GHz Wireless"
	default:
		return ""
	}
}

func isWirelessMouseOrRadioHint(s string) bool {
	low := strings.ToLower(s)
	hints := []string{
		"wireless", "2.4g", "2.4 g", "receiver", "dongle", "lightspeed", "hyperspeed",
		"slipstream", "unifying", "bolt", "radio", "bluetooth", "ble", "nano",
		"беспроводн", "радио", "приемник", "приёмник", "air", "pro x", "superlight",
		"g305", "g703", "g903", "g502", "viper", "deathadder", "basilisk", "orochi",
		"aerox", "rival", "prime", "harpe", "keris", "gladius", "dragonfly", "atlantis",
		"io nova", "nova se", "red square", "rsq-", "ajazz", "aj139", "aj159", "aj179",
		"aj199", "aj339", "aj380", "ak820", "ak980", "ardor", "edge air", "rukh",
		"phantom", "essence", "ultralight", "fury", "attack shark", "darmoshark", "vxe",
	}
	for _, h := range hints {
		if strings.Contains(low, h) {
			return true
		}
	}
	return false
}

func isVendorBatteryMouseCandidate(vid uint16, name string) bool {
	switch vid {
	case 0x25A7, 0x3554, 0x3151, 0x1D57, 0x0C45, 0x248A, 0x1EA7, 0x320F, 0x373B, 0x2FE9, 0x258A, 0x3710, 0x1915:
		return true
	}
	low := strings.ToLower(name)
	for _, kw := range []string{"io nova", "nova", "ajazz", "aj1", "aj3", "ardor", "rukh", "edge air", "phantom", "red square", "rsq", "attack shark", "compx", "vxe", "vgn", "atk", "redragon"} {
		if strings.Contains(low, kw) {
			return true
		}
	}
	return false
}

// probeVendorMouseBattery (LumaCore 1.6 Carbon): Native Win32 HID vendor battery query engine
// for IO (Nova SE / Red Square), ARDOR GAMING (Edge Air Ultra / Rukh / Phantom / Prime),
// AJAZZ (AJ139 / AJ159 / AJ179 / AJ199 / AK820 / AK980), Compx CX52850 / JM03, VXE / ATK / Attack Shark.
// Uses shared non-exclusive handles (FILE_SHARE_READ | FILE_SHARE_WRITE) so official vendor tools never conflict!
func probeVendorMouseBattery(devPath string, vid uint16, name string, caps hidCaps) (int, string) {
	if caps.UsagePage < 0xFF00 {
		return -1, ""
	}
	if !isVendorBatteryMouseCandidate(vid, name) {
		return -1, ""
	}
	pPtr, err := syscall.UTF16PtrFromString(devPath)
	if err != nil {
		return -1, ""
	}
	hRW, err := syscall.CreateFile(
		pPtr,
		syscall.GENERIC_READ|syscall.GENERIC_WRITE,
		syscall.FILE_SHARE_READ|syscall.FILE_SHARE_WRITE,
		nil,
		syscall.OPEN_EXISTING,
		0,
		0,
	)
	if err != nil || hRW == syscall.InvalidHandle {
		return -1, ""
	}
	defer syscall.CloseHandle(hRW)

	// Protocol A: Compx / JM03 / CX52850 17-byte Report 0x08 cmd 0x04 (IO Nova SE, ARDOR GAMING, Redragon, VXE, Attack Shark)
	parseCompxResp := func(resp []byte) int {
		if len(resp) < 8 {
			return -1
		}
		if (resp[0] == 0x08 || resp[0] == 0x09) && resp[1] == 0x04 && resp[2] == 0x00 {
			raw := int(resp[6])
			if raw == 0 && resp[5] > 0 && resp[5] <= 100 {
				raw = int(resp[5])
			}
			if raw >= 1 && raw <= 10 && resp[7] <= 1 {
				// Some older Compx firmwares (e.g. 0..10 steps) report 1..10; modern CX52850 reports 1..100 directly.
				// Distinguish by checking if value is clearly <= 10 while status length == 1 or voltage byte == 0.
				if resp[5] == 0x01 && resp[8] == 0x00 && resp[9] == 0x00 {
					return raw * 10
				}
			}
			if raw >= 1 && raw <= 100 {
				return raw
			}
		}
		return -1
	}

	if caps.FeatureReportByteLength == 17 || caps.OutputReportByteLength == 17 || caps.InputReportByteLength == 17 {
		// Build 17-byte Compx GetBattery command: [08] [04] [00] [00] [00] [00] [00..00] [0x55 - sum]
		for _, chk := range []byte{0x49, 0x4D, 0x51} {
			req := make([]byte, 17)
			req[0] = 0x08
			req[1] = 0x04
			req[16] = chk

			// Try Feature Report path (Ardor Edge Air Ultra, IO Nova SE, Compx Feature)
			if caps.FeatureReportByteLength >= 17 && procHidDSetFeature.Find() == nil {
				if okS, _, _ := procHidDSetFeature.Call(uintptr(hRW), uintptr(unsafe.Pointer(&req[0])), uintptr(len(req))); okS != 0 {
					time.Sleep(24 * time.Millisecond)
					for _, rid := range []byte{0x09, 0x08} {
						resp := make([]byte, caps.FeatureReportByteLength)
						resp[0] = rid
						if okG, _, _ := procHidDGetFeature.Call(uintptr(hRW), uintptr(unsafe.Pointer(&resp[0])), uintptr(len(resp))); okG != 0 {
							if pct := parseCompxResp(resp); pct >= 0 {
								return pct, "Compx/IO/Ardor HID Feature"
							}
						}
					}
				}
			}

			// Try Output Report + Input Report path (Ardor Rukh, Redragon CX52850, VXE)
			if caps.OutputReportByteLength >= 17 && procHidDSetOutputReport.Find() == nil && procHidDGetInputReport.Find() == nil {
				if okO, _, _ := procHidDSetOutputReport.Call(uintptr(hRW), uintptr(unsafe.Pointer(&req[0])), uintptr(len(req))); okO != 0 {
					time.Sleep(24 * time.Millisecond)
					for _, rid := range []byte{0x08, 0x09} {
						resp := make([]byte, caps.InputReportByteLength)
						if len(resp) >= 17 {
							resp[0] = rid
							if okI, _, _ := procHidDGetInputReport.Call(uintptr(hRW), uintptr(unsafe.Pointer(&resp[0])), uintptr(len(resp))); okI != 0 {
								if pct := parseCompxResp(resp); pct >= 0 {
									return pct, "Compx/IO/Ardor HID Output"
								}
							}
						}
					}
				}
			}
		}
	}

	// Protocol B: AJAZZ AJ-Series 2.4G / 8K (0xF7 status poll -> GET_FEATURE Report 0x05, charge at byte 3)
	if caps.FeatureReportByteLength >= 9 && caps.FeatureReportByteLength <= 65 && procHidDSetFeature.Find() == nil {
		flen := int(caps.FeatureReportByteLength)
		if flen < 65 && (vid == 0x3151 || vid == 0x3554 || strings.Contains(strings.ToLower(name), "ajazz")) {
			flen = int(caps.FeatureReportByteLength)
		}
		wake := make([]byte, flen)
		wake[0] = 0x00
		wake[1] = 0xF7
		if okW, _, _ := procHidDSetFeature.Call(uintptr(hRW), uintptr(unsafe.Pointer(&wake[0])), uintptr(len(wake))); okW != 0 {
			time.Sleep(32 * time.Millisecond)
			resp := make([]byte, flen)
			resp[0] = 0x05
			if okR, _, _ := procHidDGetFeature.Call(uintptr(hRW), uintptr(unsafe.Pointer(&resp[0])), uintptr(len(resp))); okR != 0 {
				if len(resp) >= 5 && resp[0] == 0x05 && resp[1] == 0x00 && resp[3] >= 1 && resp[3] <= 100 {
					return int(resp[3]), "Ajazz 2.4G HID Telemetry"
				}
			}
		}

		// Protocol C: AJAZZ 65-byte Feature query 0x20 sub 0x01 (resp[1] == 0x20, resp[4] == charge%)
		if flen >= 64 {
			q20 := make([]byte, flen)
			q20[0] = 0x00
			q20[1] = 0x20
			q20[2] = 0x01
			if okQ, _, _ := procHidDSetFeature.Call(uintptr(hRW), uintptr(unsafe.Pointer(&q20[0])), uintptr(len(q20))); okQ != 0 {
				time.Sleep(25 * time.Millisecond)
				resp := make([]byte, flen)
				resp[0] = 0x00
				if okR, _, _ := procHidDGetFeature.Call(uintptr(hRW), uintptr(unsafe.Pointer(&resp[0])), uintptr(len(resp))); okR != 0 {
					if resp[1] == 0x20 {
						chg := int(resp[4])
						if chg == 0xFF {
							return 100, "Ajazz HID 0x20"
						}
						if chg >= 1 && chg <= 100 {
							return chg, "Ajazz HID 0x20"
						}
					}
				}
			}
		}
	}

	return -1, ""
}

// scanHidRadioChannelBatteries (LumaCore 1.6 Carbon): Pure Win32 hid.dll + SetupDi multi-pass scanner.
// Discovers ALL present Bluetooth, BLE, 2.4GHz USB Radio Receivers, AND active HID mice/keyboards/headsets/gamepads,
// reading real product & manufacturer strings, VID/PID, standard HID Battery Feature Reports,
// AND vendor-specific battery protocols for IO (Nova SE), Ajazz, Ardor Gaming, Compx, VXE/ATK/Attack Shark — 0% WMI!
func scanHidRadioChannelBatteries(seen map[string]bool) []WirelessDeviceBattery {
	var hidGuid windowsGUID
	if modHid.Load() != nil || procHidDGetHidGuid.Find() != nil {
		return nil
	}
	_, _, _ = procHidDGetHidGuid.Call(uintptr(unsafe.Pointer(&hidGuid)))

	hDev, _, _ := procSetupDiGetClassDevsW.Call(
		uintptr(unsafe.Pointer(&hidGuid)),
		0,
		0,
		digcfPresent|digcfDeviceInterface,
	)
	if hDev == 0 || hDev == winInvalidHandle {
		return nil
	}
	defer procSetupDiDestroyDeviceInfoList.Call(hDev)

	type aggDevice struct {
		vid          uint16
		pid          uint16
		prodName     string
		mfgName      string
		isMouse      bool
		isKeyboard   bool
		isGamepad    bool
		isAudio      bool
		isBluetooth  bool
		isRadioHint  bool
		batteryPct   int
		source       string
		hasAnyUsage  bool
	}
	byVidPid := map[string]*aggDevice{}
	order := make([]string, 0, 24)

	var intfData spDeviceInterfaceData
	intfData.CbSize = uint32(unsafe.Sizeof(intfData))

	for i := uint32(0); i < 280; i++ {
		r, _, _ := procSetupDiEnumDeviceInterfaces.Call(
			hDev,
			0,
			uintptr(unsafe.Pointer(&hidGuid)),
			uintptr(i),
			uintptr(unsafe.Pointer(&intfData)),
		)
		if r == 0 {
			break
		}
		var reqSize uint32
		_, _, _ = procSetupDiGetDeviceIntfDetailW.Call(
			hDev,
			uintptr(unsafe.Pointer(&intfData)),
			0,
			0,
			uintptr(unsafe.Pointer(&reqSize)),
			0,
		)
		if reqSize < 8 || reqSize > 4096 {
			continue
		}
		detailBuf := make([]byte, reqSize)
		binary.LittleEndian.PutUint32(detailBuf[:4], 8)
		r2, _, _ := procSetupDiGetDeviceIntfDetailW.Call(
			hDev,
			uintptr(unsafe.Pointer(&intfData)),
			uintptr(unsafe.Pointer(&detailBuf[0])),
			uintptr(reqSize),
			0,
			0,
		)
		if r2 == 0 {
			continue
		}
		pathU16 := (*[1024]uint16)(unsafe.Pointer(&detailBuf[4]))
		devPath := syscall.UTF16ToString(pathU16[:(reqSize-4)/2])
		if devPath == "" {
			continue
		}
		lowPath := strings.ToLower(devPath)

		pPtr, err := syscall.UTF16PtrFromString(devPath)
		if err != nil {
			continue
		}
		hFile, err := syscall.CreateFile(
			pPtr,
			0,
			syscall.FILE_SHARE_READ|syscall.FILE_SHARE_WRITE,
			nil,
			syscall.OPEN_EXISTING,
			0,
			0,
		)
		if err != nil || hFile == syscall.InvalidHandle {
			continue
		}

		var attrs hidAttributes
		attrs.Size = uint32(unsafe.Sizeof(attrs))
		_, _, _ = procHidDGetAttributes.Call(uintptr(hFile), uintptr(unsafe.Pointer(&attrs)))

		var prodBuf [128]uint16
		prodName := ""
		if okP, _, _ := procHidDGetProductString.Call(uintptr(hFile), uintptr(unsafe.Pointer(&prodBuf[0])), uintptr(len(prodBuf)*2)); okP != 0 {
			prodName = strings.TrimSpace(syscall.UTF16ToString(prodBuf[:]))
		}
		var mfgBuf [128]uint16
		mfgName := ""
		if procHidDGetManufacturerString.Find() == nil {
			if okM, _, _ := procHidDGetManufacturerString.Call(uintptr(hFile), uintptr(unsafe.Pointer(&mfgBuf[0])), uintptr(len(mfgBuf)*2)); okM != 0 {
				mfgName = strings.TrimSpace(syscall.UTF16ToString(mfgBuf[:]))
			}
		}

		key := fmt.Sprintf("%04x:%04x", attrs.VendorID, attrs.ProductID)
		if attrs.VendorID == 0 && attrs.ProductID == 0 {
			key = lowPath
		}
		agg, exists := byVidPid[key]
		if !exists {
			agg = &aggDevice{
				vid:        attrs.VendorID,
				pid:        attrs.ProductID,
				batteryPct: -1,
			}
			byVidPid[key] = agg
			order = append(order, key)
		}
		if prodName != "" && (agg.prodName == "" || (isGenericHIDName(agg.prodName) && !isGenericHIDName(prodName)) || len(prodName) > len(agg.prodName)) {
			agg.prodName = prodName
		}
		if mfgName != "" && agg.mfgName == "" {
			agg.mfgName = mfgName
		}
		if strings.Contains(lowPath, "bthle") || strings.Contains(lowPath, "bth") || strings.Contains(lowPath, "{00001812") {
			agg.isBluetooth = true
		}
		if isWirelessMouseOrRadioHint(prodName) || isWirelessMouseOrRadioHint(mfgName) {
			agg.isRadioHint = true
		}

		var ppd uintptr
		if okPPD, _, _ := procHidDGetPreparsedData.Call(uintptr(hFile), uintptr(unsafe.Pointer(&ppd))); okPPD != 0 && ppd != 0 {
			var caps hidCaps
			if st, _, _ := procHidPGetCaps.Call(ppd, uintptr(unsafe.Pointer(&caps))); st == 0x00110000 {
				agg.hasAnyUsage = true
				switch {
				case caps.UsagePage == 0x0001 && caps.Usage == 0x0002:
					agg.isMouse = true
				case caps.UsagePage == 0x0001 && caps.Usage == 0x0006:
					agg.isKeyboard = true
				case caps.UsagePage == 0x0001 && (caps.Usage == 0x0004 || caps.Usage == 0x0005):
					agg.isGamepad = true
				case caps.UsagePage == 0x000B || (caps.UsagePage == 0x000C && (strings.Contains(strings.ToLower(prodName), "head") || strings.Contains(strings.ToLower(prodName), "audio") || strings.Contains(strings.ToLower(prodName), "ear"))):
					agg.isAudio = true
				}

				if caps.NumberFeatureValueCaps > 0 && caps.FeatureReportByteLength > 1 && caps.FeatureReportByteLength <= 128 {
					vcCount := caps.NumberFeatureValueCaps
					if vcCount > 32 {
						vcCount = 32
					}
					vcs := make([]hidValueCaps, vcCount)
					if st2, _, _ := procHidPGetValueCaps.Call(2, uintptr(unsafe.Pointer(&vcs[0])), uintptr(unsafe.Pointer(&vcCount)), ppd); st2 == 0x00110000 {
						for k := uint16(0); k < vcCount; k++ {
							vc := vcs[k]
							isBatt := (vc.UsagePage == 0x0006 && vc.UsageMin == 0x0020) ||
								(vc.UsagePage == 0x0084 && (vc.UsageMin == 0x0066 || vc.UsageMin == 0x0065)) ||
								(vc.UsagePage == 0x0085 && vc.UsageMin == 0x0066)
							if !isBatt {
								continue
							}
							rep := make([]byte, caps.FeatureReportByteLength)
							rep[0] = vc.ReportID
							if okF, _, _ := procHidDGetFeature.Call(uintptr(hFile), uintptr(unsafe.Pointer(&rep[0])), uintptr(len(rep))); okF != 0 {
								rawVal := int(rep[1])
								if vc.LogicalMax > 0 && vc.LogicalMax != 100 && rawVal <= int(vc.LogicalMax) {
									rawVal = int(math.Round(float64(rawVal) * 100.0 / float64(vc.LogicalMax)))
								}
								if rawVal >= 0 && rawVal <= 100 {
									agg.batteryPct = rawVal
									agg.source = "Win32 HID Battery"
								}
							}
						}
					}
				}

				// LumaCore 1.6: Vendor-specific battery query for IO (Nova SE), Ajazz, Ardor Gaming, Compx CX52850 / JM03!
				if agg.batteryPct < 0 && caps.UsagePage >= 0xFF00 {
					if vPct, vSrc := probeVendorMouseBattery(devPath, attrs.VendorID, agg.prodName+" "+agg.mfgName, caps); vPct >= 0 {
						agg.batteryPct = vPct
						agg.source = vSrc
					}
				}
			}
			_, _, _ = procHidDFreePreparsedData.Call(ppd)
		}
		_ = syscall.CloseHandle(hFile)
	}

	var out []WirelessDeviceBattery
	for _, key := range order {
		agg := byVidPid[key]
		if agg == nil {
			continue
		}
		knownBrand := knownWirelessVendorName(agg.vid)
		// Emit EVERY device that has: battery %, Bluetooth transport, 2.4GHz wireless hint,
		// known wireless peripheral brand, OR is an active HID Mouse / Gamepad!
		shouldEmit := agg.batteryPct >= 0 || agg.isBluetooth || agg.isRadioHint || agg.isMouse || agg.isGamepad || (knownBrand != "" && (agg.isKeyboard || agg.isAudio))
		if !shouldEmit {
			continue
		}
		// Skip internal virtual / ACPI / touchscreen / system HID nodes
		lowProd := strings.ToLower(agg.prodName)
		if strings.Contains(lowProd, "touchpad") || strings.Contains(lowProd, "touch screen") ||
			strings.Contains(lowProd, "precision") || strings.Contains(lowProd, "converted portable") ||
			strings.Contains(lowProd, "gpio") || strings.Contains(lowProd, "i2c") ||
			strings.Contains(lowProd, "vendor-defined") || strings.Contains(lowProd, "system control") {
			if agg.batteryPct < 0 && !agg.isBluetooth && !agg.isRadioHint {
				continue
			}
		}

		label := cleanPeripheralName(agg.prodName)
		if label == "" || isGenericHIDName(label) {
			prefix := agg.mfgName
			if prefix == "" {
				prefix = knownBrand
			}
			switch {
			case agg.isMouse && prefix != "":
				label = prefix + " Mouse"
			case agg.isMouse:
				label = "Wireless / HID Mouse"
			case agg.isKeyboard && prefix != "":
				label = prefix + " Keyboard"
			case agg.isGamepad && prefix != "":
				label = prefix + " Gamepad"
			case agg.isAudio && prefix != "":
				label = prefix + " Headset"
			case prefix != "":
				label = prefix
			default:
				continue
			}
		} else if knownBrand != "" && !strings.Contains(strings.ToLower(label), strings.ToLower(strings.Split(knownBrand, " ")[0])) {
			// Prefix generic receiver names like "USB Receiver" or "2.4G Receiver" with real vendor name!
			if strings.Contains(strings.ToLower(label), "receiver") || strings.Contains(strings.ToLower(label), "dongle") || strings.Contains(strings.ToLower(label), "2.4g") {
				label = knownBrand + " " + label
			}
		}

		devType := classifyPeripheralType(label)
		if devType == "other" {
			switch {
			case agg.isMouse:
				devType = "mouse"
			case agg.isKeyboard:
				devType = "keyboard"
			case agg.isGamepad:
				devType = "gamepad"
			case agg.isAudio:
				devType = "headphones"
			}
		}

		transport := "2.4GHz Радиоканал"
		switch {
		case agg.isBluetooth:
			transport = "Bluetooth"
		case agg.isRadioHint || knownBrand != "":
			transport = "2.4GHz Радиоканал"
		default:
			transport = "USB / 2.4GHz HID"
		}

		src := agg.source
		if src == "" {
			src = "Win32 HID Radio Scanner"
		}
		seenKey := strings.ToLower(label)
		if seen[seenKey] {
			continue
		}
		seen[seenKey] = true

		vidStr := ""
		pidStr := ""
		if agg.vid != 0 {
			vidStr = fmt.Sprintf("%04X", agg.vid)
			pidStr = fmt.Sprintf("%04X", agg.pid)
		}
		out = append(out, WirelessDeviceBattery{
			Name:           label,
			DeviceType:     devType,
			BatteryPercent: agg.batteryPct,
			Connected:      true,
			Transport:      transport,
			Source:         src,
			VendorID:       vidStr,
			ProductID:      pidStr,
			Manufacturer:   agg.mfgName,
			IsMouse:        agg.isMouse || devType == "mouse",
		})
	}
	return out
}

// ==================== 5. PURE WIN32 TCP NETWORK MONITOR (LumaShield 1.4, ZERO WMI / ZERO POWERSHELL!) ====================

type mibTcpRowOwnerPid struct {
	State      uint32
	LocalAddr  uint32
	LocalPort  uint32
	RemoteAddr uint32
	RemotePort uint32
	OwningPid  uint32
}

func formatWinIPv4Port(addr, portNet uint32) (string, uint16) {
	ip := fmt.Sprintf("%d.%d.%d.%d", byte(addr), byte(addr>>8), byte(addr>>16), byte(addr>>24))
	port := uint16((portNet&0xFF)<<8 | (portNet>>8)&0xFF)
	return fmt.Sprintf("%s:%d", ip, port), port
}

func (p *platformProbe) ActiveTcpConnections() []ActiveTcpConnection {
	var size uint32
	_, _, _ = procGetExtendedTcpTable.Call(0, uintptr(unsafe.Pointer(&size)), 0, afInet, tcpTableOwnerPidAll, 0)
	if size < 4 || size > 4*1024*1024 {
		return []ActiveTcpConnection{}
	}
	buf := make([]byte, size)
	r, _, _ := procGetExtendedTcpTable.Call(
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(unsafe.Pointer(&size)),
		0,
		afInet,
		tcpTableOwnerPidAll,
		0,
	)
	if r != 0 {
		return []ActiveTcpConnection{}
	}
	numEntries := binary.LittleEndian.Uint32(buf[:4])
	rowSize := uint32(unsafe.Sizeof(mibTcpRowOwnerPid{}))
	stateNames := map[uint32]string{
		2: "LISTEN", 3: "SYN_SENT", 4: "SYN_RCVD", 5: "ESTABLISHED", 8: "CLOSE_WAIT", 11: "TIME_WAIT",
	}
	suspPorts := map[uint16]bool{4444: true, 1337: true, 31337: true, 6667: true, 3333: true, 9001: true, 5555: true}

	pidNames := map[uint32]string{}
	out := make([]ActiveTcpConnection, 0, 48)
	for i := uint32(0); i < numEntries && len(out) < 55; i++ {
		off := 4 + i*rowSize
		if off+rowSize > uint32(len(buf)) {
			break
		}
		row := (*mibTcpRowOwnerPid)(unsafe.Pointer(&buf[off]))
		st := stateNames[row.State]
		if st == "" || (st != "ESTABLISHED" && st != "LISTEN") {
			continue
		}
		localStr, _ := formatWinIPv4Port(row.LocalAddr, row.LocalPort)
		remoteStr, rPort := formatWinIPv4Port(row.RemoteAddr, row.RemotePort)
		if st == "LISTEN" {
			remoteStr = "0.0.0.0:*"
		}
		pname, ok := pidNames[row.OwningPid]
		if !ok {
			if row.OwningPid == 0 || row.OwningPid == 4 {
				pname = "System"
			} else if _, _, _, full := queryProcessStatsNative(row.OwningPid); full != "" {
				pname = filepath.Base(full)
			} else {
				pname = fmt.Sprintf("PID %d", row.OwningPid)
			}
			pidNames[row.OwningPid] = pname
		}
		susp := suspPorts[rPort]
		note := ""
		if susp {
			note = fmt.Sprintf("Подозрительный удалённый порт :%d", rPort)
		}
		out = append(out, ActiveTcpConnection{
			LocalAddr:   localStr,
			RemoteAddr:  remoteStr,
			State:       st,
			PID:         int(row.OwningPid),
			ProcessName: pname,
			Suspicious:  susp,
			Note:        note,
		})
	}
	return out
}

// ==================== 6. WIN32 HOST WINDOW SNAP & SIDE-BY-SIDE DUAL-WINDOW WORKSPACE ====================

var (
	findHwndMu     sync.Mutex
	findTargetPID  uint32
	foundTargetWnd uintptr
	findHwndCb     = syscall.NewCallback(func(hwnd uintptr, lparam uintptr) uintptr {
		vis, _, _ := procProIsWindowVisible.Call(hwnd)
		if vis == 0 {
			return 1
		}
		var pid uint32
		_, _, _ = procGetWindowThreadProcessId.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
		if pid != findTargetPID {
			return 1
		}
		tLen, _, _ := procProGetWindowTextLenW.Call(hwnd)
		if tLen == 0 {
			return 1
		}
		foundTargetWnd = hwnd
		return 0
	})
)

func findMainHwndForPID(pid int) uintptr {
	findHwndMu.Lock()
	defer findHwndMu.Unlock()
	findTargetPID = uint32(pid)
	foundTargetWnd = 0
	_, _, _ = procProEnumWindows.Call(findHwndCb, 0)
	return foundTargetWnd
}

func computeUsableScreenWorkRect(hwnd uintptr, taskbarPos string, taskbarPx int) winRect {
	var rc winRect
	if hwnd != 0 {
		hMon, _, _ := procMonitorFromWindow.Call(hwnd, monitorDefaultToNear)
		var mi monitorInfo
		mi.CbSize = uint32(unsafe.Sizeof(mi))
		if r, _, _ := procGetMonitorInfoW.Call(hMon, uintptr(unsafe.Pointer(&mi))); r != 0 {
			rc = mi.RcMonitor
		}
	}
	if rc.Right-rc.Left <= 0 || rc.Bottom-rc.Top <= 0 {
		scrW, _, _ := procGetSystemMetrics.Call(smCXScreen)
		scrH, _, _ := procGetSystemMetrics.Call(smCYScreen)
		rc = winRect{Left: 0, Top: 0, Right: int32(scrW), Bottom: int32(scrH)}
	}
	bar := int32(taskbarPx)
	if bar < 0 {
		bar = 0
	}
	if bar > 110 {
		bar = 110
	}
	if bar > 0 {
		switch strings.ToLower(taskbarPos) {
		case "top":
			rc.Top += bar
		case "left":
			rc.Left += bar
		case "right":
			rc.Right -= bar
		default:
			rc.Bottom -= bar
		}
	}
	return rc
}

func placeHostHwndInZone(hwnd uintptr, zone string, rc winRect) {
	const swRestore = 9
	const swpShowWindow = 0x0040
	_, _, _ = procProShowWindow.Call(hwnd, swRestore)
	w := rc.Right - rc.Left
	h := rc.Bottom - rc.Top
	halfW := w / 2
	halfH := h / 2

	x, y, ww, hh := rc.Left, rc.Top, w, h
	switch strings.ToLower(zone) {
	case "left":
		x, y, ww, hh = rc.Left, rc.Top, halfW, h
	case "right":
		x, y, ww, hh = rc.Left+halfW, rc.Top, w-halfW, h
	case "top":
		x, y, ww, hh = rc.Left, rc.Top, w, halfH
	case "bottom":
		x, y, ww, hh = rc.Left, rc.Top+halfH, w, h-halfH
	case "tl":
		x, y, ww, hh = rc.Left, rc.Top, halfW, halfH
	case "tr":
		x, y, ww, hh = rc.Left+halfW, rc.Top, w-halfW, halfH
	case "bl":
		x, y, ww, hh = rc.Left, rc.Top+halfH, halfW, h-halfH
	case "br":
		x, y, ww, hh = rc.Left+halfW, rc.Top+halfH, w-halfW, h-halfH
	}
	_, _, _ = procProAllowSetFg.Call(^uintptr(0))
	_, _, _ = procProSetWindowPos.Call(hwnd, 0, uintptr(x), uintptr(y), uintptr(ww), uintptr(hh), swpShowWindow)
	_, _, _ = procProBringToTop.Call(hwnd)
	_, _, _ = procProSetFg.Call(hwnd)
}

func (p *platformProbe) SnapHostWindow(pid int, zone string, taskbarPos string, taskbarPx int) error {
	if pid <= 0 {
		return fmt.Errorf("invalid pid")
	}
	hwnd := findMainHwndForPID(pid)
	if hwnd == 0 {
		return fmt.Errorf("window not found for pid %d", pid)
	}
	rc := computeUsableScreenWorkRect(hwnd, taskbarPos, taskbarPx)
	placeHostHwndInZone(hwnd, zone, rc)
	return nil
}

func (p *platformProbe) ArrangeTwoHostWindows(leftPid int, rightPid int, taskbarPos string, taskbarPx int) error {
	h1 := findMainHwndForPID(leftPid)
	h2 := findMainHwndForPID(rightPid)
	if h1 == 0 && h2 == 0 {
		return fmt.Errorf("target windows not found")
	}
	ref := h1
	if ref == 0 {
		ref = h2
	}
	rc := computeUsableScreenWorkRect(ref, taskbarPos, taskbarPx)
	if h1 != 0 {
		placeHostHwndInZone(h1, "left", rc)
	}
	if h2 != 0 {
		placeHostHwndInZone(h2, "right", rc)
	}
	return nil
}

// ==================== 7. NATIVE WIN32 MOUSE SPEED & EFFECTIVE DPI ENGINE (LumaCore 1.5) ====================

var (
	winMouseMu        sync.Mutex
	winSavedSensorDPI = 1600
	winMouseSpeedCurve = [21]float64{
		0,
		0.03125, 0.0625, 0.125, 0.25, 0.375,
		0.5, 0.625, 0.75, 0.875, 1.0,
		1.25, 1.5, 1.75, 2.0, 2.25,
		2.5, 2.75, 3.0, 3.25, 3.5,
	}
)

const (
	spiGetMouse             = 0x0003
	spiSetMouse             = 0x0004
	spiGetWheelScrollLines  = 0x0068
	spiSetWheelScrollLines  = 0x0069
	spiGetMouseSpeed        = 0x0070
	spiSetMouseSpeed        = 0x0071
	spifUpdateIniAndChange  = 0x0003
)

func (p *platformProbe) detectPrimaryMouseName() string {
	devs := p.GetWirelessDeviceBatteries(false)
	for _, d := range devs {
		if d.IsMouse || d.DeviceType == "mouse" {
			return d.Name
		}
	}
	return "Системная мышь Windows (HID)"
}

func (p *platformProbe) GetMouseDPIConfig() MouseDPIConfig {
	winMouseMu.Lock()
	sensor := winSavedSensorDPI
	winMouseMu.Unlock()

	var spd uint32 = 10
	_, _, _ = procProSystemParametersInfoW.Call(spiGetMouseSpeed, 0, uintptr(unsafe.Pointer(&spd)), 0)
	if spd < 1 || spd > 20 {
		spd = 10
	}

	var mouseParams [3]int32
	_, _, _ = procProSystemParametersInfoW.Call(spiGetMouse, 0, uintptr(unsafe.Pointer(&mouseParams[0])), 0)
	enhance := mouseParams[2] != 0

	var scroll uint32 = 3
	_, _, _ = procProSystemParametersInfoW.Call(spiGetWheelScrollLines, 0, uintptr(unsafe.Pointer(&scroll)), 0)
	if scroll < 1 || scroll > 20 {
		scroll = 3
	}

	mult := winMouseSpeedCurve[spd]
	return MouseDPIConfig{
		OK:                true,
		WindowsSpeed:      int(spd),
		SensorDPI:         sensor,
		EffectiveDPI:      int(math.Round(float64(sensor) * mult)),
		Multiplier:        mult,
		EnhancePrecision:  enhance,
		ScrollLines:       int(scroll),
		DetectedMouseName: p.detectPrimaryMouseName(),
		Platform:          "windows",
	}
}

func (p *platformProbe) SetMouseDPIConfig(sensorDPI, targetEffectiveDPI, windowsSpeed int, enhancePrecision *bool, scrollLines int) (MouseDPIConfig, error) {
	winMouseMu.Lock()
	if sensorDPI >= 100 && sensorDPI <= 30000 {
		winSavedSensorDPI = sensorDPI
	}
	sensor := winSavedSensorDPI
	winMouseMu.Unlock()

	desiredSpd := 0
	if windowsSpeed >= 1 && windowsSpeed <= 20 {
		desiredSpd = windowsSpeed
	} else if targetEffectiveDPI >= 100 && targetEffectiveDPI <= 30000 {
		wantMult := float64(targetEffectiveDPI) / float64(sensor)
		bestSpd := 10
		bestDiff := 9999.0
		for s := 1; s <= 20; s++ {
			d := math.Abs(winMouseSpeedCurve[s] - wantMult)
			if d < bestDiff {
				bestDiff = d
				bestSpd = s
			}
		}
		desiredSpd = bestSpd
	}

	if desiredSpd >= 1 && desiredSpd <= 20 {
		// SPI_SETMOUSESPEED takes speed value directly as pvParam (integer cast to uintptr)
		_, _, _ = procProSystemParametersInfoW.Call(spiSetMouseSpeed, 0, uintptr(desiredSpd), spifUpdateIniAndChange)
	}

	if enhancePrecision != nil {
		var mouseParams [3]int32
		_, _, _ = procProSystemParametersInfoW.Call(spiGetMouse, 0, uintptr(unsafe.Pointer(&mouseParams[0])), 0)
		if *enhancePrecision {
			mouseParams[0] = 6
			mouseParams[1] = 10
			mouseParams[2] = 1
		} else {
			mouseParams[0] = 0
			mouseParams[1] = 0
			mouseParams[2] = 0
		}
		_, _, _ = procProSystemParametersInfoW.Call(spiSetMouse, 0, uintptr(unsafe.Pointer(&mouseParams[0])), spifUpdateIniAndChange)
	}

	if scrollLines >= 1 && scrollLines <= 20 {
		_, _, _ = procProSystemParametersInfoW.Call(spiSetWheelScrollLines, uintptr(scrollLines), 0, spifUpdateIniAndChange)
	}

	return p.GetMouseDPIConfig(), nil
}

// ==================== 8. NATIVE WIN32 COMPACT SCREENSHOT & OS RECYCLE BIN (LUMA OS 1.5 CARBON) ====================

const (
	smCxScreenWin      = 0
	smCyScreenWin      = 1
	gdiSrcCopy         = 0x00CC0020
	sherbNoConfirm     = 0x00000001
	sherbNoProgressUI  = 0x00000002
	sherbNoSound       = 0x00000004
)

// CaptureScreenNative captures the primary Windows display via GDI32 BitBlt and encodes
// an ultra-compact high-clarity JPEG (quality 82, ~110-180 KB) saved directly to ~/Pictures/LumaCaptures/.
func (p *platformProbe) CaptureScreenNative() (CaptureMediaFile, error) {
	wRaw, _, _ := procProGetSystemMetrics.Call(smCxScreenWin)
	hRaw, _, _ := procProGetSystemMetrics.Call(smCyScreenWin)
	w, h := int(wRaw), int(hRaw)
	if w <= 0 || h <= 0 || w > 7680 || h > 4320 {
		return CaptureMediaFile{}, fmt.Errorf("invalid screen metrics %dx%d", w, h)
	}

	hdcScreen, _, _ := procProGetDC.Call(0)
	if hdcScreen == 0 {
		return CaptureMediaFile{}, fmt.Errorf("GetDC(0) failed")
	}
	defer procProReleaseDC.Call(0, hdcScreen)

	hdcMem, _, _ := procCreateCompatibleDC.Call(hdcScreen)
	if hdcMem == 0 {
		return CaptureMediaFile{}, fmt.Errorf("CreateCompatibleDC failed")
	}
	defer procDeleteDC.Call(hdcMem)

	hBmp, _, _ := procCreateCompatibleBitmap.Call(hdcScreen, uintptr(w), uintptr(h))
	if hBmp == 0 {
		return CaptureMediaFile{}, fmt.Errorf("CreateCompatibleBitmap failed")
	}
	defer procDeleteObject.Call(hBmp)

	oldObj, _, _ := procSelectObject.Call(hdcMem, hBmp)
	defer procSelectObject.Call(hdcMem, oldObj)

	okBlt, _, _ := procBitBlt.Call(
		hdcMem, 0, 0, uintptr(w), uintptr(h),
		hdcScreen, 0, 0, gdiSrcCopy,
	)
	if okBlt == 0 {
		return CaptureMediaFile{}, fmt.Errorf("BitBlt failed")
	}

	var bih bitmapInfoHeader
	bih.BiSize = uint32(unsafe.Sizeof(bih))
	bih.BiWidth = int32(w)
	bih.BiHeight = -int32(h) // top-down DIB
	bih.BiPlanes = 1
	bih.BiBitCount = 32
	bih.BiCompression = biRGB

	pixels := make([]byte, w*h*4)
	lines, _, _ := procGetDIBits.Call(
		hdcMem,
		hBmp,
		0,
		uintptr(h),
		uintptr(unsafe.Pointer(&pixels[0])),
		uintptr(unsafe.Pointer(&bih)),
		dibRGBColors,
	)
	if lines == 0 {
		return CaptureMediaFile{}, fmt.Errorf("GetDIBits screen capture failed")
	}

	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for i := 0; i < len(pixels); i += 4 {
		img.Pix[i] = pixels[i+2]   // R
		img.Pix[i+1] = pixels[i+1] // G
		img.Pix[i+2] = pixels[i]   // B
		img.Pix[i+3] = 255         // A
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 82}); err != nil {
		return CaptureMediaFile{}, err
	}

	dir := getLumaCapturesDir("screenshot")
	name := fmt.Sprintf("luma_shot_%s.jpg", time.Now().Format("20060102_150405"))
	full := filepath.Join(dir, name)
	if err := os.WriteFile(full, buf.Bytes(), 0644); err != nil {
		return CaptureMediaFile{}, err
	}
	return CaptureMediaFile{
		Name:      name,
		Path:      full,
		Kind:      "screenshot",
		SizeBytes: int64(buf.Len()),
		CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

// SupportsNativeScreenFrame reports that native GDI32 background frame capture is available on Windows.
func (p *platformProbe) SupportsNativeScreenFrame() bool {
	return true
}

// CaptureScreenJPEGFrame captures a single scaled screen frame as JPEG with guaranteed GDI cleanup.
// Used by Luma OS 1.5.2 Zero-Freeze Native Screen Recorder (no WebView2 getDisplayMedia modal deadlocks!).
func (p *platformProbe) CaptureScreenJPEGFrame(maxWidth, quality int) ([]byte, int, int, error) {
	wRaw, _, _ := procProGetSystemMetrics.Call(smCxScreenWin)
	hRaw, _, _ := procProGetSystemMetrics.Call(smCyScreenWin)
	w, h := int(wRaw), int(hRaw)
	if w <= 0 || h <= 0 || w > 7680 || h > 4320 {
		return nil, 0, 0, fmt.Errorf("invalid screen metrics %dx%d", w, h)
	}

	hdcScreen, _, _ := procProGetDC.Call(0)
	if hdcScreen == 0 {
		return nil, 0, 0, fmt.Errorf("GetDC(0) failed")
	}
	defer procProReleaseDC.Call(0, hdcScreen)

	hdcMem, _, _ := procCreateCompatibleDC.Call(hdcScreen)
	if hdcMem == 0 {
		return nil, 0, 0, fmt.Errorf("CreateCompatibleDC failed")
	}
	defer procDeleteDC.Call(hdcMem)

	hBmp, _, _ := procCreateCompatibleBitmap.Call(hdcScreen, uintptr(w), uintptr(h))
	if hBmp == 0 {
		return nil, 0, 0, fmt.Errorf("CreateCompatibleBitmap failed")
	}
	defer procDeleteObject.Call(hBmp)

	oldObj, _, _ := procSelectObject.Call(hdcMem, hBmp)
	defer procSelectObject.Call(hdcMem, oldObj)

	okBlt, _, _ := procBitBlt.Call(
		hdcMem, 0, 0, uintptr(w), uintptr(h),
		hdcScreen, 0, 0, gdiSrcCopy,
	)
	if okBlt == 0 {
		return nil, 0, 0, fmt.Errorf("BitBlt failed")
	}

	var bih bitmapInfoHeader
	bih.BiSize = uint32(unsafe.Sizeof(bih))
	bih.BiWidth = int32(w)
	bih.BiHeight = -int32(h)
	bih.BiPlanes = 1
	bih.BiBitCount = 32
	bih.BiCompression = biRGB

	pixels := make([]byte, w*h*4)
	lines, _, _ := procGetDIBits.Call(
		hdcMem,
		hBmp,
		0,
		uintptr(h),
		uintptr(unsafe.Pointer(&pixels[0])),
		uintptr(unsafe.Pointer(&bih)),
		dibRGBColors,
	)
	if lines == 0 {
		return nil, 0, 0, fmt.Errorf("GetDIBits failed")
	}

	outW, outH := w, h
	if maxWidth > 0 && w > maxWidth {
		outW = maxWidth
		outH = int(float64(h) * float64(maxWidth) / float64(w))
	}
	// Ensure even dimensions for broad video player compatibility
	outW = (outW / 2) * 2
	outH = (outH / 2) * 2
	if outW < 320 {
		outW = 320
	}
	if outH < 180 {
		outH = 180
	}

	img := image.NewRGBA(image.Rect(0, 0, outW, outH))
	if outW == w && outH == h {
		for i := 0; i < len(pixels); i += 4 {
			img.Pix[i] = pixels[i+2]
			img.Pix[i+1] = pixels[i+1]
			img.Pix[i+2] = pixels[i]
			img.Pix[i+3] = 255
		}
	} else {
		for y := 0; y < outH; y++ {
			sy := (y * h) / outH
			rowOff := sy * w * 4
			dstRow := y * outW * 4
			for x := 0; x < outW; x++ {
				sx := (x * w) / outW
				si := rowOff + sx*4
				di := dstRow + x*4
				img.Pix[di] = pixels[si+2]
				img.Pix[di+1] = pixels[si+1]
				img.Pix[di+2] = pixels[si]
				img.Pix[di+3] = 255
			}
		}
	}

	if quality < 45 || quality > 95 {
		quality = 74
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
		return nil, 0, 0, err
	}
	return buf.Bytes(), outW, outH, nil
}

// EmptyOSRecycleBinNative empties the Windows system Recycle Bin silently via SHEmptyRecycleBinW.
func (p *platformProbe) EmptyOSRecycleBinNative() error {
	if procSHEmptyRecycleBinW.Find() == nil {
		_, _, _ = procSHEmptyRecycleBinW.Call(0, 0, sherbNoConfirm|sherbNoProgressUI|sherbNoSound)
	}
	return nil
}
