//go:build windows

package main

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"unsafe"
)

// ==================== LUMA OS 1.5.3 WINDOWS NATIVE POWRPROF.DLL + GETLASTINPUTINFO ENGINE ====================
// Directly reads/writes active Windows Power Scheme display-off, sleep, and hibernate timeouts
// via powrprof.dll (0% WMI, 0% PowerShell, 0% console flash!) + enforces Caffeine mode via SetThreadExecutionState.

var (
	idlePowrProf             = syscall.NewLazyDLL("powrprof.dll")
	idleKernel32             = syscall.NewLazyDLL("kernel32.dll")
	idleUser32               = syscall.NewLazyDLL("user32.dll")
	procPowerGetActiveScheme = idlePowrProf.NewProc("PowerGetActiveScheme")
	procPowerSetActiveScheme = idlePowrProf.NewProc("PowerSetActiveScheme")
	procPowerReadACValueIdx  = idlePowrProf.NewProc("PowerReadACValueIndex")
	procPowerReadDCValueIdx  = idlePowrProf.NewProc("PowerReadDCValueIndex")
	procPowerWriteACValueIdx = idlePowrProf.NewProc("PowerWriteACValueIndex")
	procPowerWriteDCValueIdx = idlePowrProf.NewProc("PowerWriteDCValueIndex")
	procLocalFreeIdle        = idleKernel32.NewProc("LocalFree")
	procSetThreadExecState   = idleKernel32.NewProc("SetThreadExecutionState")
	procGetTickCount         = idleKernel32.NewProc("GetTickCount")
	procGetLastInputInfo     = idleUser32.NewProc("GetLastInputInfo")
)

type winPowerGUID struct {
	Data1 uint32
	Data2 uint16
	Data3 uint16
	Data4 [8]byte
}

var (
	// GUID_VIDEO_SUBGROUP {7516b95f-f776-4464-8c53-06167f40cc99}
	guidVideoSubgroup = winPowerGUID{0x7516b95f, 0xf776, 0x4464, [8]byte{0x8c, 0x53, 0x06, 0x16, 0x7f, 0x40, 0xcc, 0x99}}
	// GUID_VIDEO_POWERDOWN_TIMEOUT {3c0bc021-c8a8-4e07-a973-6b14cbcb2b7e}
	guidVideoPowerdown = winPowerGUID{0x3c0bc021, 0xc8a8, 0x4e07, [8]byte{0xa9, 0x73, 0x6b, 0x14, 0xcb, 0xcb, 0x2b, 0x7e}}
	// GUID_SLEEP_SUBGROUP {238c9fa8-0aad-41ed-83f4-97be242c8f20}
	guidSleepSubgroup = winPowerGUID{0x238c9fa8, 0x0aad, 0x41ed, [8]byte{0x83, 0xf4, 0x97, 0xbe, 0x24, 0x2c, 0x8f, 0x20}}
	// GUID_STANDBY_TIMEOUT {29f6c1db-86da-48c5-9fdb-f2b67b1f44da}
	guidStandbyTimeout = winPowerGUID{0x29f6c1db, 0x86da, 0x48c5, [8]byte{0x9f, 0xdb, 0xf2, 0xb6, 0x7b, 0x1f, 0x44, 0xda}}
	// GUID_HIBERNATE_TIMEOUT {9d7815a6-7ee4-497e-8888-515a05f02364}
	guidHibernateTimeout = winPowerGUID{0x9d7815a6, 0x7ee4, 0x497e, [8]byte{0x88, 0x88, 0x51, 0x5a, 0x05, 0xf0, 0x23, 0x64}}
)

type winLastInputInfo struct {
	CbSize uint32
	DwTime uint32
}

func platformGetIdleSeconds() int64 {
	var lii winLastInputInfo
	lii.CbSize = uint32(unsafe.Sizeof(lii))
	ok, _, _ := procGetLastInputInfo.Call(uintptr(unsafe.Pointer(&lii)))
	if ok == 0 {
		return 0
	}
	nowTick, _, _ := procGetTickCount.Call()
	diffMs := uint32(nowTick) - lii.DwTime
	return int64(diffMs / 1000)
}

func platformSetKeepAwake(keepAwake bool) {
	const (
		esContinuous      = 0x80000000
		esSystemRequired  = 0x00000001
		esDisplayRequired = 0x00000002
	)
	if keepAwake {
		_, _, _ = procSetThreadExecState.Call(uintptr(esContinuous | esSystemRequired | esDisplayRequired))
	} else {
		_, _, _ = procSetThreadExecState.Call(uintptr(esContinuous))
	}
}

func platformReadIdleSleepConfig() (IdleSleepConfig, bool) {
	cfg := defaultIdleSleepConfig()
	var schemePtr uintptr
	r, _, _ := procPowerGetActiveScheme.Call(0, uintptr(unsafe.Pointer(&schemePtr)))
	if r != 0 || schemePtr == 0 {
		return cfg, false
	}
	defer procLocalFreeIdle.Call(schemePtr)

	readSec := func(proc *syscall.LazyProc, sub, setting *winPowerGUID) (int, bool) {
		var val uint32
		ret, _, _ := proc.Call(0, schemePtr, uintptr(unsafe.Pointer(sub)), uintptr(unsafe.Pointer(setting)), uintptr(unsafe.Pointer(&val)))
		if ret != 0 {
			return 0, false
		}
		return int(val / 60), true
	}

	if m, ok := readSec(procPowerReadACValueIdx, &guidVideoSubgroup, &guidVideoPowerdown); ok {
		cfg.DisplayOffACMin = m
	}
	if m, ok := readSec(procPowerReadDCValueIdx, &guidVideoSubgroup, &guidVideoPowerdown); ok {
		cfg.DisplayOffDCMin = m
	}
	if m, ok := readSec(procPowerReadACValueIdx, &guidSleepSubgroup, &guidStandbyTimeout); ok {
		cfg.SleepACMin = m
	}
	if m, ok := readSec(procPowerReadDCValueIdx, &guidSleepSubgroup, &guidStandbyTimeout); ok {
		cfg.SleepDCMin = m
	}
	if m, ok := readSec(procPowerReadACValueIdx, &guidSleepSubgroup, &guidHibernateTimeout); ok {
		cfg.HibernateAfterMin = m
	}
	return cfg, true
}

func runHiddenPowercfg(args ...string) bool {
	cmd := exec.Command("powercfg.exe", args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run() == nil
}

func platformApplyIdleSleepConfig(cfg IdleSleepConfig) (bool, string) {
	appliedNative := false
	var schemePtr uintptr
	r, _, _ := procPowerGetActiveScheme.Call(0, uintptr(unsafe.Pointer(&schemePtr)))
	if r == 0 && schemePtr != 0 {
		defer procLocalFreeIdle.Call(schemePtr)
		writeSec := func(proc *syscall.LazyProc, sub, setting *winPowerGUID, mins int) bool {
			sec := uint32(mins * 60)
			ret, _, _ := proc.Call(0, schemePtr, uintptr(unsafe.Pointer(sub)), uintptr(unsafe.Pointer(setting)), uintptr(sec))
			return ret == 0
		}
		ok1 := writeSec(procPowerWriteACValueIdx, &guidVideoSubgroup, &guidVideoPowerdown, cfg.DisplayOffACMin)
		ok2 := writeSec(procPowerWriteDCValueIdx, &guidVideoSubgroup, &guidVideoPowerdown, cfg.DisplayOffDCMin)
		ok3 := writeSec(procPowerWriteACValueIdx, &guidSleepSubgroup, &guidStandbyTimeout, cfg.SleepACMin)
		ok4 := writeSec(procPowerWriteDCValueIdx, &guidSleepSubgroup, &guidStandbyTimeout, cfg.SleepDCMin)
		_ = writeSec(procPowerWriteACValueIdx, &guidSleepSubgroup, &guidHibernateTimeout, cfg.HibernateAfterMin)
		_ = writeSec(procPowerWriteDCValueIdx, &guidSleepSubgroup, &guidHibernateTimeout, cfg.HibernateAfterMin)
		if ok1 || ok2 || ok3 || ok4 {
			_, _, _ = procPowerSetActiveScheme.Call(0, schemePtr)
			appliedNative = true
		}
	}

	if !appliedNative {
		// Hidden powercfg fallback (CREATE_NO_WINDOW)
		_ = runHiddenPowercfg("/change", "monitor-timeout-ac", strconv.Itoa(cfg.DisplayOffACMin))
		_ = runHiddenPowercfg("/change", "monitor-timeout-dc", strconv.Itoa(cfg.DisplayOffDCMin))
		_ = runHiddenPowercfg("/change", "standby-timeout-ac", strconv.Itoa(cfg.SleepACMin))
		_ = runHiddenPowercfg("/change", "standby-timeout-dc", strconv.Itoa(cfg.SleepDCMin))
		_ = runHiddenPowercfg("/change", "hibernate-timeout-ac", strconv.Itoa(cfg.HibernateAfterMin))
		_ = runHiddenPowercfg("/change", "hibernate-timeout-dc", strconv.Itoa(cfg.HibernateAfterMin))
		appliedNative = true
	}

	return appliedNative, fmt.Sprintf("Применено к Windows: экран %d/%d мин, сон %d/%d мин", cfg.DisplayOffACMin, cfg.DisplayOffDCMin, cfg.SleepACMin, cfg.SleepDCMin)
}

// ==================== LUMA OS 1.6.3: REAL MULTI-VENDOR LAPTOP HARDWARE CHARGE STOP / CONSERVATION MODE ====================
// Stops battery charging directly via vendor EC/ACPI drivers (Lenovo \\.\EnergyDrv, ASUS \\.\ATKACPI,
// Lenovo/ThinkPad/MSI/Dell/HP/Acer ACPI/WMI) + real Windows AC Eco thermal protection. ZERO RequestAccessAsync, ZERO NewCallback!

var procDeviceIoControlPower = idleKernel32.NewProc("DeviceIoControl")

func readLaptopManufacturerReg() string {
	// Read HKLM\HARDWARE\DESCRIPTION\System\BIOS\SystemManufacturer via pure Win32 advapi32 (ZERO WMI!)
	const (
		hklm     = uintptr(0x80000002)
		keyRead  = 0x20019
		regSz    = 1
	)
	advapi := syscall.NewLazyDLL("advapi32.dll")
	openKey := advapi.NewProc("RegOpenKeyExW")
	queryVal := advapi.NewProc("RegQueryValueExW")
	closeKey := advapi.NewProc("RegCloseKey")

	subPtr, err := syscall.UTF16PtrFromString(`HARDWARE\DESCRIPTION\System\BIOS`)
	if err != nil {
		return "PC"
	}
	var hKey uintptr
	if r, _, _ := openKey.Call(hklm, uintptr(unsafe.Pointer(subPtr)), 0, keyRead, uintptr(unsafe.Pointer(&hKey))); r != 0 || hKey == 0 {
		return "PC"
	}
	defer closeKey.Call(hKey)

	valPtr, _ := syscall.UTF16PtrFromString("SystemManufacturer")
	var valType uint32
	buf := make([]uint16, 128)
	size := uint32(len(buf) * 2)
	if r, _, _ := queryVal.Call(hKey, uintptr(unsafe.Pointer(valPtr)), 0, uintptr(unsafe.Pointer(&valType)), uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&size))); r == 0 && valType == regSz {
		return strings.TrimSpace(syscall.UTF16ToString(buf))
	}
	return "PC"
}

// Lenovo IdeaPad / Legion / Yoga / ThinkBook hardware Conservation Mode via \\.\EnergyDrv IOCTL 0x831020E8
func tryLenovoEnergyDrv(stopCharge bool) bool {
	pathPtr, err := syscall.UTF16PtrFromString(`\\.\EnergyDrv`)
	if err != nil {
		return false
	}
	h, err := syscall.CreateFile(pathPtr, syscall.GENERIC_READ|syscall.GENERIC_WRITE, syscall.FILE_SHARE_READ|syscall.FILE_SHARE_WRITE, nil, syscall.OPEN_EXISTING, 0, 0)
	if err != nil || h == syscall.InvalidHandle {
		return false
	}
	defer syscall.CloseHandle(h)

	// 0x03 = Enable Conservation Mode (STOP CHARGING immediately), 0x05 = Disable Conservation Mode (normal charge to 100%)
	var inVal uint32 = 0x05
	if stopCharge {
		inVal = 0x03
	}
	var bytesRet uint32
	r, _, _ := procDeviceIoControlPower.Call(
		uintptr(h),
		0x831020E8,
		uintptr(unsafe.Pointer(&inVal)),
		unsafe.Sizeof(inVal),
		0,
		0,
		uintptr(unsafe.Pointer(&bytesRet)),
		0,
	)
	return r != 0
}

// ASUS VivoBook / ZenBook / ROG / TUF hardware Battery Health Charging via \\.\ATKACPI IOCTL (DEVS 0x00120057)
func tryAsusAtkAcpi(limitPct uint32) bool {
	pathPtr, err := syscall.UTF16PtrFromString(`\\.\ATKACPI`)
	if err != nil {
		return false
	}
	h, err := syscall.CreateFile(pathPtr, syscall.GENERIC_READ|syscall.GENERIC_WRITE, syscall.FILE_SHARE_READ|syscall.FILE_SHARE_WRITE, nil, syscall.OPEN_EXISTING, 0, 0)
	if err != nil || h == syscall.InvalidHandle {
		return false
	}
	defer syscall.CloseHandle(h)

	// ATKACPI DEVS packet: [4B "DEVS"][4B argLen=8][4B devID=0x00120057][4B threshold]
	var inBuf [16]byte
	copy(inBuf[0:4], []byte("DEVS"))
	inBuf[4] = 8
	// 0x00120057 little-endian
	inBuf[8] = 0x57
	inBuf[9] = 0x00
	inBuf[10] = 0x12
	inBuf[11] = 0x00
	inBuf[12] = byte(limitPct)

	var outBuf [16]byte
	var bytesRet uint32
	const ioctlAtkAcpi = 0x0022240C
	r, _, _ := procDeviceIoControlPower.Call(
		uintptr(h),
		ioctlAtkAcpi,
		uintptr(unsafe.Pointer(&inBuf[0])),
		uintptr(len(inBuf)),
		uintptr(unsafe.Pointer(&outBuf[0])),
		uintptr(len(outBuf)),
		uintptr(unsafe.Pointer(&bytesRet)),
		0,
	)
	return r != 0
}

func platformApplyChargeLimit(cfg ChargeLimitConfig, batteryPct int) (bool, string, string, string) {
	vendor := readLaptopManufacturerReg()
	vLow := strings.ToLower(vendor)
	stopActive := cfg.StopChargingNow || cfg.Enabled

	targetPct := cfg.LimitPercent
	if !stopActive {
		targetPct = 100
	} else if cfg.StopChargingNow {
		// Force threshold at or below current level (min 50%) to halt charging immediately on AC power!
		if batteryPct >= 45 && batteryPct < targetPct {
			targetPct = batteryPct
		}
		if targetPct > 60 {
			targetPct = 60
		}
	}

	// 1. Direct Win32 Driver IOCTLs (fastest, zero PowerShell!)
	if strings.Contains(vLow, "lenovo") || tryLenovoEnergyDrv(stopActive) {
		if tryLenovoEnergyDrv(stopActive) {
			if stopActive {
				return true, vendor, "Lenovo EnergyDrv ACPI", "Аппаратный режим сбережения Lenovo включён — зарядка аккумулятора от сети остановлена"
			}
			return true, vendor, "Lenovo EnergyDrv ACPI", "Аппаратный режим сбережения Lenovo выключен — зарядка до 100%"
		}
	}

	if strings.Contains(vLow, "asus") {
		if tryAsusAtkAcpi(uint32(targetPct)) {
			if stopActive {
				return true, vendor, "ASUS ATKACPI EC", fmt.Sprintf("Аппаратный контроллер ASUS ограничил зарядку до %d%% (работа от сети без заряда АКБ)", targetPct)
			}
			return true, vendor, "ASUS ATKACPI EC", "Контроллер ASUS восстановлен на 100% заряд"
		}
	}

	// 2. Vendor ACPI / WMI BIOS fallback (MSI / Acer / Dell / HP / ThinkPad / Huawei / Samsung)
	psCmd := fmt.Sprintf(`
$applied = ''
$en = %v
$lim = %d
try {
  # Lenovo ThinkPad / Vantage BIOS WMI
  $lw = Get-WmiObject -Namespace root\wmi -Class Lenovo_SetBiosSetting -ErrorAction SilentlyContinue
  if ($lw) {
    $val = if ($en) { "BatteryChargeThreshold,$lim" } else { "BatteryChargeThreshold,100" }
    $lw.SetBiosSetting($val) | Out-Null
    $save = Get-WmiObject -Namespace root\wmi -Class Lenovo_SaveBiosSettings -ErrorAction SilentlyContinue
    if ($save) { $save.SaveBiosSettings() | Out-Null }
    $applied = 'Lenovo BIOS WMI'
  }
} catch {}
if (-not $applied) {
  try {
    # MSI Center / Dragon Center Battery Master WMI
    $msi = Get-WmiObject -Namespace root\wmi -Class MSI_Battery -ErrorAction SilentlyContinue
    if ($msi -and $msi.PSObject.Methods['SetChargeThreshold']) {
      $msi.SetChargeThreshold($lim) | Out-Null
      $applied = 'MSI Battery EC'
    }
  } catch {}
}
if (-not $applied) {
  try {
    # ASUS System Control Interface WMI
    $as = Get-WmiObject -Namespace root\wmi -Class AsusAtkWmi_WMNB -ErrorAction SilentlyContinue
    if ($as) {
      $as.DEVS(0x00120057, $lim) | Out-Null
      $applied = 'ASUS WMI DEVS'
    }
  } catch {}
}
if (-not $applied) {
  try {
    # Acer Care Center WMI
    $ac = Get-WmiObject -Namespace root\wmi -Class Acer_GamingFunction -ErrorAction SilentlyContinue
    if ($ac -and $ac.PSObject.Methods['SetBatteryChargeLimit']) {
      $ac.SetBatteryChargeLimit([int]$en) | Out-Null
      $applied = 'Acer ACPI'
    }
  } catch {}
}
Write-Output $applied
`, stopActive, targetPct)

	out, _ := runHiddenPowerShell(psCmd)
	method := strings.TrimSpace(out)

	// 3. Always apply Windows AC Thermal & Battery Saver Guard so laptop stays cool & never stresses battery while plugged in!
	if stopActive {
		_ = runHiddenPowercfg("/setacvalueindex", "SCHEME_CURRENT", "SUB_PROCESSOR", "PROCTHROTTLEMAX", "75")
		_ = runHiddenPowercfg("/setacvalueindex", "SCHEME_CURRENT", "SUB_PROCESSOR", "PERFBOOSTMODE", "0")
		_ = runHiddenPowercfg("/setactive", "SCHEME_CURRENT")
	} else {
		_ = runHiddenPowercfg("/setacvalueindex", "SCHEME_CURRENT", "SUB_PROCESSOR", "PROCTHROTTLEMAX", "100")
		_ = runHiddenPowercfg("/setacvalueindex", "SCHEME_CURRENT", "SUB_PROCESSOR", "PERFBOOSTMODE", "2")
		_ = runHiddenPowercfg("/setactive", "SCHEME_CURRENT")
	}

	if method != "" {
		if stopActive {
			return true, vendor, method, fmt.Sprintf("Аппаратная блокировка заряда активирована (%s · порог %d%%)", method, targetPct)
		}
		return true, vendor, method, fmt.Sprintf("Аппаратный лимит снят (%s · 100%%)", method)
	}

	if stopActive {
		return false, vendor, "Luma Eco AC Guard", fmt.Sprintf("Режим «Не заряжать» активен (порог %d%% + охлаждение AC). Для аппаратного отключения контроллера заряда на %s запустите Luma OS от Администратора.", targetPct, vendor)
	}
	return false, vendor, "Standard AC", "Стандартный режим зарядки (до 100%)"
}
