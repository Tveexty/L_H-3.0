//go:build windows

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// ==================== LUMA OS 1.7 (OXYGEN) — WIN32 PLATFORM HELPERS (1 SINGLETON CALLBACK!) ====================

var (
	oxyUser32                = syscall.NewLazyDLL("user32.dll")
	procOxyEnumDisplayMons   = oxyUser32.NewProc("EnumDisplayMonitors")
	procOxyGetMonitorInfoW   = oxyUser32.NewProc("GetMonitorInfoW")
	procOxyGetKeyState       = oxyUser32.NewProc("GetKeyState")
	procOxyGetWindowLongPtrW = oxyUser32.NewProc("GetWindowLongPtrW")
	procOxySetWindowLongPtrW = oxyUser32.NewProc("SetWindowLongPtrW")
	procOxySetLayeredAttr    = oxyUser32.NewProc("SetLayeredWindowAttributes")
	procOxySetWindowPos      = oxyUser32.NewProc("SetWindowPos")
	procOxyShowWindow        = oxyUser32.NewProc("ShowWindow")
	procOxyKeybdEvent        = oxyUser32.NewProc("keybd_event")
	procOxyMouseEvent        = oxyUser32.NewProc("mouse_event")
	procOxyGetCursorPos      = oxyUser32.NewProc("GetCursorPos")
	procOxySetCursorPos      = oxyUser32.NewProc("SetCursorPos")

	oxyMonMu      sync.Mutex
	oxyMonScratch []MonitorInfo
	// Strictly ONE package-level singleton callback for EnumDisplayMonitors (ZERO leaks!)
	oxyEnumMonitorCb = syscall.NewCallback(func(hMon, _ uintptr, _ uintptr, _ uintptr) uintptr {
		type rectT struct{ Left, Top, Right, Bottom int32 }
		type monInfoExW struct {
			CbSize    uint32
			RcMonitor rectT
			RcWork    rectT
			DwFlags   uint32
			SzDevice  [32]uint16
		}
		var mi monInfoExW
		mi.CbSize = uint32(unsafe.Sizeof(mi))
		if ok, _, _ := procOxyGetMonitorInfoW.Call(hMon, uintptr(unsafe.Pointer(&mi))); ok != 0 {
			idx := len(oxyMonScratch) + 1
			name := strings.TrimSpace(syscall.UTF16ToString(mi.SzDevice[:]))
			if name == "" {
				name = fmt.Sprintf("Монитор %d", idx)
			}
			oxyMonScratch = append(oxyMonScratch, MonitorInfo{
				Index:      idx,
				Name:       name,
				Primary:    (mi.DwFlags & 1) != 0,
				X:          int(mi.RcMonitor.Left),
				Y:          int(mi.RcMonitor.Top),
				Width:      int(mi.RcMonitor.Right - mi.RcMonitor.Left),
				Height:     int(mi.RcMonitor.Bottom - mi.RcMonitor.Top),
				WorkX:      int(mi.RcWork.Left),
				WorkY:      int(mi.RcWork.Top),
				WorkWidth:  int(mi.RcWork.Right - mi.RcWork.Left),
				WorkHeight: int(mi.RcWork.Bottom - mi.RcWork.Top),
			})
		}
		return 1
	})

	oxyAppliedRuleStampMu sync.Mutex
	oxyAppliedRuleStamps  = map[string]int64{}

	oxyAudioSessMu      sync.Mutex
	oxyAudioSessCache   []AudioAppSession
	oxyAudioSessCacheAt time.Time
)

func listMonitorsOS() []MonitorInfo {
	oxyMonMu.Lock()
	defer oxyMonMu.Unlock()
	oxyMonScratch = oxyMonScratch[:0]
	_, _, _ = procOxyEnumDisplayMons.Call(0, 0, oxyEnumMonitorCb, 0)
	if len(oxyMonScratch) == 0 {
		return []MonitorInfo{{Index: 1, Name: "Основной монитор", Primary: true, X: 0, Y: 0, Width: 1920, Height: 1080, WorkWidth: 1920, WorkHeight: 1040}}
	}
	out := make([]MonitorInfo, len(oxyMonScratch))
	copy(out, oxyMonScratch)
	return out
}

func oxyReadProcessBaseName(pid uint32) string {
	const processQueryLimitedInfo = 0x1000
	h, err := syscall.OpenProcess(processQueryLimitedInfo, false, pid)
	if err != nil || h == 0 {
		return ""
	}
	defer syscall.CloseHandle(h)
	procQuery := modKernel32.NewProc("QueryFullProcessImageNameW")
	buf := make([]uint16, 512)
	sz := uint32(len(buf))
	r, _, _ := procQuery.Call(uintptr(h), 0, uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&sz)))
	if r == 0 || sz == 0 {
		return ""
	}
	return filepath.Base(syscall.UTF16ToString(buf[:sz]))
}

func applyWindowRulesOS(rules []WindowRule) (int, []string, bool, bool, map[string]int) {
	wins := enumVisibleWindowsNative()
	mons := listMonitorsOS()
	applied := 0
	matchedSet := map[string]bool{}
	hitsByID := map[string]int{}
	activeDND := false
	activeNoComp := false

	const (
		gwlStyle         = ^uintptr(15) // -16
		gwlExStyle       = ^uintptr(19) // -20
		wsCaption        = 0x00C00000
		wsThickFrame     = 0x00040000
		wsExLayered      = 0x00080000
		lwaAlpha         = 0x00000002
		hwndTopMost      = ^uintptr(0)
		swpNoActivate    = 0x0010
		swpNoMove        = 0x0002
		swpNoSize        = 0x0001
		swpFrameChanged  = 0x0020
		swMaximize       = 3
	)

	nowSec := time.Now().Unix()
	for pid, entry := range wins {
		if entry.hwnd == 0 {
			continue
		}
		procName := strings.TrimSpace(oxyReadProcessBaseName(uint32(pid)))
		for _, rule := range rules {
			if !rule.Enabled {
				continue
			}
			if strings.TrimSpace(rule.MatchProcess) == "" && strings.TrimSpace(rule.MatchTitle) == "" {
				continue
			}
			procMatch := strings.TrimSpace(rule.MatchProcess) == "" || matchRulePattern(rule.MatchProcess, procName)
			titleMatch := strings.TrimSpace(rule.MatchTitle) == "" || matchRulePattern(rule.MatchTitle, entry.title)
			// If both process & title patterns are set, allow EITHER if they look like synonyms (e.g. calc / Калькулятор)
			matched := false
			if strings.TrimSpace(rule.MatchProcess) != "" && strings.TrimSpace(rule.MatchTitle) != "" {
				matched = procMatch || titleMatch
			} else {
				matched = procMatch && titleMatch
			}
			if !matched {
				continue
			}

			matchedSet[rule.Name] = true
			if rule.AutoDND {
				activeDND = true
			}
			if rule.DisableCompositor {
				activeNoComp = true
			}

			// Avoid thrashing geometry every tick: apply geometry/style once per window per 20s unless forced
			stampKey := fmt.Sprintf("%s_%d", rule.ID, entry.hwnd)
			oxyAppliedRuleStampMu.Lock()
			prev := oxyAppliedRuleStamps[stampKey]
			if nowSec-prev < 20 {
				oxyAppliedRuleStampMu.Unlock()
				continue
			}
			oxyAppliedRuleStamps[stampKey] = nowSec
			if len(oxyAppliedRuleStamps) > 400 {
				oxyAppliedRuleStamps = map[string]int64{stampKey: nowSec}
			}
			oxyAppliedRuleStampMu.Unlock()

			// 1. Borderless mode
			if rule.Borderless {
				st, _, _ := procOxyGetWindowLongPtrW.Call(entry.hwnd, gwlStyle)
				nextSt := st &^ uintptr(wsCaption|wsThickFrame)
				if nextSt != st {
					_, _, _ = procOxySetWindowLongPtrW.Call(entry.hwnd, gwlStyle, nextSt)
					_, _, _ = procOxySetWindowPos.Call(entry.hwnd, 0, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoActivate|swpFrameChanged)
				}
			}

			// 2. Target Monitor & Zone Placement
			if rule.Zone != "" && rule.Zone != "none" {
				mon := mons[0]
				if rule.MonitorIndex >= 1 && rule.MonitorIndex <= len(mons) {
					mon = mons[rule.MonitorIndex-1]
				}
				x, y, w, h := mon.WorkX, mon.WorkY, mon.WorkWidth, mon.WorkHeight
				switch rule.Zone {
				case "left":
					w = mon.WorkWidth / 2
				case "right":
					w = mon.WorkWidth / 2
					x = mon.WorkX + w
				case "top-left":
					w = mon.WorkWidth / 2
					h = mon.WorkHeight / 2
				case "top-right":
					w = mon.WorkWidth / 2
					h = mon.WorkHeight / 2
					x = mon.WorkX + w
				case "center":
					w = int(float64(mon.WorkWidth) * 0.72)
					h = int(float64(mon.WorkHeight) * 0.78)
					x = mon.WorkX + (mon.WorkWidth-w)/2
					y = mon.WorkY + (mon.WorkHeight-h)/2
				case "fullscreen":
					x, y, w, h = mon.X, mon.Y, mon.Width, mon.Height
				case "maximized":
					_, _, _ = procOxySetWindowPos.Call(entry.hwnd, 0, uintptr(x), uintptr(y), uintptr(w), uintptr(h), swpNoActivate)
					_, _, _ = procOxyShowWindow.Call(entry.hwnd, swMaximize)
				case "custom":
					if rule.CustomW > 100 && rule.CustomH > 100 {
						x, y, w, h = mon.WorkX+rule.CustomX, mon.WorkY+rule.CustomY, rule.CustomW, rule.CustomH
					}
				}
				if rule.Zone != "maximized" {
					insertAfter := uintptr(0)
					if rule.AlwaysOnTop {
						insertAfter = hwndTopMost
					}
					_, _, _ = procOxySetWindowPos.Call(entry.hwnd, insertAfter, uintptr(x), uintptr(y), uintptr(w), uintptr(h), swpNoActivate)
				}
			} else if rule.AlwaysOnTop {
				_, _, _ = procOxySetWindowPos.Call(entry.hwnd, hwndTopMost, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoActivate)
			}

			// 3. Opacity (30..99%)
			if rule.Opacity >= 30 && rule.Opacity < 100 {
				ex, _, _ := procOxyGetWindowLongPtrW.Call(entry.hwnd, gwlExStyle)
				if (ex & wsExLayered) == 0 {
					_, _, _ = procOxySetWindowLongPtrW.Call(entry.hwnd, gwlExStyle, ex|wsExLayered)
				}
				alpha := byte((rule.Opacity * 255) / 100)
				_, _, _ = procOxySetLayeredAttr.Call(entry.hwnd, 0, uintptr(alpha), lwaAlpha)
			}

			applied++
			hitsByID[rule.ID]++
		}
	}

	matchedNames := make([]string, 0, len(matchedSet))
	for k := range matchedSet {
		matchedNames = append(matchedNames, k)
	}
	return applied, matchedNames, activeDND, activeNoComp, hitsByID
}

func readLockKeysOS() (caps, num, scroll bool) {
	const (
		vkCapital = 0x14
		vkNumlock = 0x90
		vkScroll  = 0x91
	)
	c, _, _ := procOxyGetKeyState.Call(vkCapital)
	n, _, _ := procOxyGetKeyState.Call(vkNumlock)
	s, _, _ := procOxyGetKeyState.Call(vkScroll)
	return (c & 1) != 0, (n & 1) != 0, (s & 1) != 0
}

// Per-App Core Audio Sessions (cached 3.5s, 4s timeout, zero UI freeze)
const psCoreAudioTypeDef = `
$code = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class LumaCoreAudio {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    int NotImpl1();
    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
  }
  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
  }
  [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionManager2 {
    int NotImpl1(); int NotImpl2();
    [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
  }
  [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionEnumerator {
    [PreserveSig] int GetCount(out int SessionCount);
    [PreserveSig] int GetSession(int SessionCount, out IAudioSessionControl2 Session);
  }
  [Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionControl2 {
    [PreserveSig] int GetState(out int pRetVal);
    [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int NotImpl3(); int NotImpl4(); int NotImpl5(); int NotImpl6(); int NotImpl7(); int NotImpl8(); int NotImpl9();
    int NotImpl10(); int NotImpl11();
    [PreserveSig] int GetProcessId(out uint pRetVal);
  }
  [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISimpleAudioVolume {
    [PreserveSig] int SetMasterVolume(float fLevel, ref Guid EventContext);
    [PreserveSig] int GetMasterVolume(out float pfLevel);
    [PreserveSig] int SetMute(bool bMute, ref Guid EventContext);
    [PreserveSig] int GetMute(out bool pbMute);
  }
  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioEndpointVolume {
    int f1(); int f2(); int f3(); int f4(); int f5(); int f6(); int f7(); int f8(); int f9(); int f10(); int f11();
    [PreserveSig] int SetMute(bool bMute, ref Guid pguidEventContext);
    [PreserveSig] int GetMute(out bool pbMute);
  }

  public static string ListSessions() {
    var list = new List<string>();
    try {
      var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
      IMMDevice dev;
      enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
      if (dev == null) return "[]";
      Guid iid = typeof(IAudioSessionManager2).GUID;
      object mgrObj;
      dev.Activate(ref iid, 23, IntPtr.Zero, out mgrObj);
      var mgr = (IAudioSessionManager2)mgrObj;
      IAudioSessionEnumerator sEnum;
      mgr.GetSessionEnumerator(out sEnum);
      int count; sEnum.GetCount(out count);
      for (int i = 0; i < count; i++) {
        IAudioSessionControl2 ctl;
        if (sEnum.GetSession(i, out ctl) != 0 || ctl == null) continue;
        uint pid = 0; ctl.GetProcessId(out pid);
        if (pid == 0) continue;
        int state = 0; ctl.GetState(out state);
        var volCtl = ctl as ISimpleAudioVolume;
        float vol = 1f; bool muted = false;
        if (volCtl != null) { volCtl.GetMasterVolume(out vol); volCtl.GetMute(out muted); }
        string name = "App"; string title = "";
        try { var p = Process.GetProcessById((int)pid); name = p.ProcessName; title = p.MainWindowTitle; } catch {}
        if (string.IsNullOrEmpty(title)) title = name;
        name = name.Replace("\\", "\\\\").Replace("\"", "\\\"");
        title = title.Replace("\\", "\\\\").Replace("\"", "\\\"");
        list.Add(string.Format("{{\"pid\":{0},\"name\":\"{1}\",\"title\":\"{2}\",\"volume\":{3},\"muted\":{4},\"playing\":{5}}}",
          pid, name, title, (int)Math.Round(vol * 100), muted ? "true" : "false", state == 1 ? "true" : "false"));
      }
    } catch {}
    return "[" + string.Join(",", list) + "]";
  }

  public static bool SetAppVol(int targetPid, int volPct, int muteMode) {
    try {
      var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
      IMMDevice dev;
      enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
      if (dev == null) return false;
      Guid iid = typeof(IAudioSessionManager2).GUID;
      object mgrObj;
      dev.Activate(ref iid, 23, IntPtr.Zero, out mgrObj);
      var mgr = (IAudioSessionManager2)mgrObj;
      IAudioSessionEnumerator sEnum;
      mgr.GetSessionEnumerator(out sEnum);
      int count; sEnum.GetCount(out count);
      Guid ctx = Guid.Empty;
      bool ok = false;
      for (int i = 0; i < count; i++) {
        IAudioSessionControl2 ctl;
        if (sEnum.GetSession(i, out ctl) != 0 || ctl == null) continue;
        uint pid = 0; ctl.GetProcessId(out pid);
        if ((int)pid != targetPid) continue;
        var volCtl = ctl as ISimpleAudioVolume;
        if (volCtl == null) continue;
        if (volPct >= 0) volCtl.SetMasterVolume(Math.Max(0f, Math.Min(1f, volPct / 100f)), ref ctx);
        if (muteMode >= 0) volCtl.SetMute(muteMode == 1, ref ctx);
        ok = true;
      }
      return ok;
    } catch { return false; }
  }

  public static bool SetMicMute(bool mute) {
    try {
      var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
      IMMDevice dev;
      enumerator.GetDefaultAudioEndpoint(1, 0, out dev); // eCapture = 1
      if (dev == null) return false;
      Guid iid = typeof(IAudioEndpointVolume).GUID;
      object epObj;
      dev.Activate(ref iid, 23, IntPtr.Zero, out epObj);
      var ep = (IAudioEndpointVolume)epObj;
      Guid ctx = Guid.Empty;
      ep.SetMute(mute, ref ctx);
      return true;
    } catch { return false; }
  }
}
'@
if (-not ([System.Management.Automation.PSTypeName]'LumaCoreAudio').Type) { Add-Type -TypeDefinition $code -Language CSharp }
`

func listAudioAppSessionsOS(probe *platformProbe) []AudioAppSession {
	oxyAudioSessMu.Lock()
	if time.Since(oxyAudioSessCacheAt) < 3500*time.Millisecond && oxyAudioSessCache != nil {
		out := append([]AudioAppSession(nil), oxyAudioSessCache...)
		oxyAudioSessMu.Unlock()
		return out
	}
	oxyAudioSessMu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", psCoreAudioTypeDef+`[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; [LumaCoreAudio]::ListSessions()`)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	var sessions []AudioAppSession
	if outBytes, err := cmd.Output(); err == nil {
		_ = json.Unmarshal([]byte(strings.TrimSpace(string(outBytes))), &sessions)
	}
	seenPID := map[int]bool{}
	dedup := make([]AudioAppSession, 0, len(sessions))
	for _, s := range sessions {
		if s.PID <= 0 || seenPID[s.PID] {
			continue
		}
		seenPID[s.PID] = true
		s.IconURL = "/api/kernel/app-icon?name=" + s.Name
		dedup = append(dedup, s)
	}
	oxyAudioSessMu.Lock()
	oxyAudioSessCache = dedup
	oxyAudioSessCacheAt = time.Now()
	oxyAudioSessMu.Unlock()
	return dedup
}

func setAudioAppVolumeOS(pid int, vol *int, muted *bool) error {
	volVal := -1
	if vol != nil {
		volVal = *vol
	}
	muteVal := -1
	if muted != nil {
		if *muted {
			muteVal = 1
		} else {
			muteVal = 0
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	script := psCoreAudioTypeDef + fmt.Sprintf(`[LumaCoreAudio]::SetAppVol(%d, %d, %d)`, pid, volVal, muteVal)
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_, err := cmd.Output()
	oxyAudioSessMu.Lock()
	oxyAudioSessCacheAt = time.Time{}
	oxyAudioSessMu.Unlock()
	return err
}

func toggleMicMuteOS(mute bool) error {
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	b := "$false"
	if mute {
		b = "$true"
	}
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", psCoreAudioTypeDef+fmt.Sprintf(`[LumaCoreAudio]::SetMicMute(%s)`, b))
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_, err := cmd.Output()
	return err
}

func runImageOCROS(raw []byte) (string, string, error) {
	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("luma_ocr_%d.png", time.Now().UnixNano()))
	if err := os.WriteFile(tmpFile, raw, 0o600); err != nil {
		return "", "WinRT OCR", err
	}
	defer os.Remove(tmpFile)

	ps := fmt.Sprintf(`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine,Windows.Media.Ocr,ContentType=WindowsRuntime]
function Await($op, $t) {
  $m = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`+"`"+`1' } | Select-Object -First 1
  $task = $m.MakeGenericMethod($t).Invoke($null, @($op))
  $task.Wait(4500) | Out-Null
  return $task.Result
}
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync('%s')) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bmp = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$eng = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$res = Await ($eng.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Output $res.Text
`, strings.ReplaceAll(tmpFile, "'", "''"))

	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.Output()
	if err != nil {
		return "", "WinRT OCR", fmt.Errorf("OCR недоступен на текущем профиле")
	}
	return strings.TrimSpace(string(out)), "WinRT Native OCR", nil
}

func pastePlainTextOS() {
	time.Sleep(140 * time.Millisecond)
	const (
		vkControl = 0x11
		vkV       = 0x56
		keyUp     = 0x0002
	)
	_, _, _ = procOxyKeybdEvent.Call(vkControl, 0, 0, 0)
	_, _, _ = procOxyKeybdEvent.Call(vkV, 0, 0, 0)
	_, _, _ = procOxyKeybdEvent.Call(vkV, 0, keyUp, 0)
	_, _, _ = procOxyKeybdEvent.Call(vkControl, 0, keyUp, 0)
}

func oxygenRemoteInputOS(action string, dx, dy int, text string) {
	const (
		mouseLeftDown  = 0x0002
		mouseLeftUp    = 0x0004
		mouseRightDown = 0x0008
		mouseRightUp   = 0x0010
		mouseWheel     = 0x0800
		vkMediaNext    = 0xB0
		vkMediaPrev    = 0xB1
		vkMediaPlay    = 0xB3
		keyUp          = 0x0002
	)
	switch action {
	case "move":
		var pt struct{ X, Y int32 }
		_, _, _ = procOxyGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
		_, _, _ = procOxySetCursorPos.Call(uintptr(int(pt.X)+dx), uintptr(int(pt.Y)+dy))
	case "click", "lclick":
		_, _, _ = procOxyMouseEvent.Call(mouseLeftDown, 0, 0, 0, 0)
		_, _, _ = procOxyMouseEvent.Call(mouseLeftUp, 0, 0, 0, 0)
	case "rclick":
		_, _, _ = procOxyMouseEvent.Call(mouseRightDown, 0, 0, 0, 0)
		_, _, _ = procOxyMouseEvent.Call(mouseRightUp, 0, 0, 0, 0)
	case "scroll":
		_, _, _ = procOxyMouseEvent.Call(mouseWheel, 0, 0, uintptr(uint32(int32(dy*120))), 0)
	case "media_play":
		_, _, _ = procOxyKeybdEvent.Call(vkMediaPlay, 0, 0, 0)
		_, _, _ = procOxyKeybdEvent.Call(vkMediaPlay, 0, keyUp, 0)
	case "media_next":
		_, _, _ = procOxyKeybdEvent.Call(vkMediaNext, 0, 0, 0)
		_, _, _ = procOxyKeybdEvent.Call(vkMediaNext, 0, keyUp, 0)
	case "media_prev":
		_, _, _ = procOxyKeybdEvent.Call(vkMediaPrev, 0, 0, 0)
		_, _, _ = procOxyKeybdEvent.Call(vkMediaPrev, 0, keyUp, 0)
	case "lock":
		_ = exec.Command("rundll32.exe", "user32.dll,LockWorkStation").Start()
	case "type":
		if text != "" {
			// Safe UTF-8 clipboard paste injection so Russian & emoji text types 100% accurately!
			probe := newPlatformProbe()
			_ = probe.SetClipboard(text)
			pastePlainTextOS()
		}
	}
}
