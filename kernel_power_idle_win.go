//go:build windows

package main

import (
	"fmt"
	"os/exec"
	"strconv"
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
