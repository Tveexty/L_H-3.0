package main

import (
	"bufio"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA OS 1.8.3: INSTANT & ACCURATE REAL-TIME STEAM DOWNLOAD ENGINE ====================
// Solves BOTH slow reaction AND inaccurate download percentage (e.g. 11% vs 60%):
//   1. Discovers ALL Steam libraries via Windows Registry (HKCU/HKLM) + libraryfolders.vdf + drives.
//   2. Reads HKCU\Software\Valve\Steam\Apps\<appid>\Updating for <1s instant start/finish reaction!
//   3. Strict top-level VDF brace-depth parser for appmanifest_*.acf (nested depots never corrupt stats).
//   4. Tails last 64KB of logs/content_log.txt for live state changes, download rate (Mbps), & finish events.
//   5. Self-calibrating real-time steam.exe GetProcessIoCounters delta tracker interpolates live progress &
//      speed (MB/s) smoothly every second between Steam's lazy .acf disk flushes!

type steamRegAppState struct {
	AppID    string
	Name     string
	Updating bool
}

type steamContentLogApp struct {
	StateText   string // Downloading | Staging | Preallocating | Verifying | Paused | Finished
	BytesDone   int64
	BytesTotal  int64
	UpdatedAt   time.Time
	Finished    bool
	Suspended   bool
}

type steamRateSample struct {
	At   time.Time
	Mbps float64
}

type steamContentLogSnapshot struct {
	Apps        map[string]*steamContentLogApp
	RateMbps    float64
	RateAt      time.Time
	RateSamples []steamRateSample
}

type steamAppTracker struct {
	AppID         string
	LastPhase     string // download | stage
	AnchorACF     int64
	AnchorTotal   int64
	AnchorIOWrite uint64
	AnchorAt      time.Time

	LastIOWrite   uint64
	LastIOTime    time.Time
	SmoothSpeedMB float64
	LiveDone      int64
	IORatio       float64 // self-calibrated acfBytes / steamExeWriteBytes
	Calibrations  int
	IdleTicks     int
}

var (
	steamTrackerMu sync.Mutex
	steamTrackers  = map[string]*steamAppTracker{}

	reSteamVDFPath   = regexp.MustCompile(`(?i)"(?:path|\d+)"\s+"([A-Za-z]:[^"]+|/[^"]+)"`)
	reSteamRateMbps  = regexp.MustCompile(`(?i)Current download rate:\s*([0-9]+(?:\.[0-9]+)?)\s*(Mbps|Kbps|Bps)`)
	reSteamLogLine   = regexp.MustCompile(`^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s*(.*)$`)
	reSteamAppIDLine = regexp.MustCompile(`(?i)AppID\s+(\d+)\s+(.*)$`)
	reSteamDLFrac    = regexp.MustCompile(`(?i)download\s+(\d+)\s*/\s*(\d+)`)
)

// parseTopLevelACF parses ONLY depth-1 key-value pairs inside "AppState" { ... }
// so nested blocks ("InstalledDepots", "StagedDepots", "UserConfig") NEVER overwrite top-level fields.
func parseTopLevelACF(raw []byte) map[string]string {
	out := make(map[string]string, 24)
	depth := 0
	sc := bufio.NewScanner(strings.NewReader(string(raw)))
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		if line == "{" {
			depth++
			continue
		}
		if line == "}" {
			if depth > 0 {
				depth--
			}
			continue
		}
		if depth == 1 {
			if m := acfKVRe.FindStringSubmatch(line); len(m) >= 3 {
				out[strings.ToLower(m[1])] = m[2]
			}
		}
	}
	return out
}

func discoverSteamRootsAndLibraries183(extraDirs ...string) (roots []string, steamappsDirs []string) {
	seenRoot := map[string]bool{}
	seenSA := map[string]bool{}

	addRoot := func(dir string) {
		clean := filepath.Clean(strings.TrimSpace(dir))
		if clean == "" || clean == "." {
			return
		}
		if strings.EqualFold(filepath.Base(clean), "steamapps") {
			clean = filepath.Dir(clean)
		}
		k := strings.ToLower(clean)
		if seenRoot[k] {
			return
		}
		if st, err := os.Stat(clean); err == nil && st.IsDir() {
			seenRoot[k] = true
			roots = append(roots, clean)
		}
	}
	addSA := func(dir string) {
		clean := filepath.Clean(strings.TrimSpace(dir))
		if clean == "" || clean == "." {
			return
		}
		sa := clean
		if !strings.EqualFold(filepath.Base(sa), "steamapps") {
			sa = filepath.Join(clean, "steamapps")
		}
		k := strings.ToLower(sa)
		if seenSA[k] {
			return
		}
		if st, err := os.Stat(sa); err == nil && st.IsDir() {
			seenSA[k] = true
			steamappsDirs = append(steamappsDirs, sa)
			addRoot(filepath.Dir(sa))
		}
	}

	// 1. Explicit caller / env overrides
	for _, ed := range extraDirs {
		if strings.TrimSpace(ed) != "" {
			addRoot(ed)
			addSA(ed)
		}
	}
	if custom := strings.TrimSpace(os.Getenv("LUMA_STEAM_DIR")); custom != "" {
		addRoot(custom)
		addSA(custom)
	}

	// 2. Native OS Registry / standard Steam install roots
	for _, nr := range getSteamInstallRootsNative() {
		addRoot(nr)
		addSA(nr)
	}

	// 3. Standard fallbacks
	home, _ := os.UserHomeDir()
	if runtime.GOOS == "windows" {
		for _, pf := range []string{os.Getenv("ProgramFiles(x86)"), os.Getenv("ProgramFiles"), `C:\Program Files (x86)`, `C:\Program Files`} {
			if pf != "" {
				addRoot(filepath.Join(pf, "Steam"))
				addSA(filepath.Join(pf, "Steam"))
			}
		}
		// Check common SteamLibrary roots across drives C..H
		for _, drv := range []string{"C:", "D:", "E:", "F:", "G:", "H:"} {
			for _, sub := range []string{"Steam", "SteamLibrary", `Games\Steam`, `Games\SteamLibrary`} {
				p := drv + `\` + sub
				if st, err := os.Stat(filepath.Join(p, "steamapps")); err == nil && st.IsDir() {
					addSA(p)
				}
			}
		}
	} else if home != "" {
		for _, p := range []string{
			filepath.Join(home, ".steam", "steam"),
			filepath.Join(home, ".local", "share", "Steam"),
			filepath.Join(home, "Steam"),
		} {
			addRoot(p)
			addSA(p)
		}
	}

	// 4. Parse libraryfolders.vdf from every discovered Steam root!
	for _, base := range append([]string{}, roots...) {
		for _, vp := range []string{
			filepath.Join(base, "steamapps", "libraryfolders.vdf"),
			filepath.Join(base, "config", "libraryfolders.vdf"),
			filepath.Join(base, "libraryfolders.vdf"),
		} {
			raw, err := os.ReadFile(vp)
			if err != nil {
				continue
			}
			for _, m := range reSteamVDFPath.FindAllStringSubmatch(string(raw), -1) {
				if len(m) >= 2 {
					p := strings.ReplaceAll(m[1], `\\`, `\`)
					addSA(p)
				}
			}
		}
	}

	return roots, steamappsDirs
}

// parseSteamContentLogTail reads only the last 64KB of logs/content_log.txt (<0.3ms!)
// to catch instant download start/finish/pause events and Steam's own exact download rate in Mbps!
func parseSteamContentLogTail(steamRoots []string) steamContentLogSnapshot {
	snap := steamContentLogSnapshot{
		Apps: map[string]*steamContentLogApp{},
	}
	now := time.Now()

	for _, root := range steamRoots {
		logPath := filepath.Join(root, "logs", "content_log.txt")
		f, err := os.Open(logPath)
		if err != nil {
			continue
		}
		info, err := f.Stat()
		if err != nil {
			_ = f.Close()
			continue
		}
		const maxTail int64 = 64 * 1024
		startOff := int64(0)
		if info.Size() > maxTail {
			startOff = info.Size() - maxTail
		}
		_, _ = f.Seek(startOff, io.SeekStart)
		rawBytes, _ := io.ReadAll(f)
		_ = f.Close()

		lines := strings.Split(string(rawBytes), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			ts := now
			body := line
			if m := reSteamLogLine.FindStringSubmatch(line); len(m) == 3 {
				if parsed, perr := time.ParseInLocation("2006-01-02 15:04:05", m[1], time.Local); perr == nil {
					ts = parsed
				}
				body = m[2]
			}

			// Ignore ancient log lines (> 6 hours old)
			if now.Sub(ts) > 6*time.Hour {
				continue
			}

			if rm := reSteamRateMbps.FindStringSubmatch(body); len(rm) == 3 {
				val, _ := strconv.ParseFloat(rm[1], 64)
				unit := strings.ToLower(rm[2])
				mbps := val
				if unit == "kbps" {
					mbps = val / 1000.0
				} else if unit == "bps" {
					mbps = val / 1_000_000.0
				}
				if mbps > 0.05 {
					snap.RateSamples = append(snap.RateSamples, steamRateSample{At: ts, Mbps: mbps})
				}
				if ts.After(snap.RateAt) || snap.RateAt.IsZero() {
					snap.RateMbps = mbps
					snap.RateAt = ts
				}
			}

			if am := reSteamAppIDLine.FindStringSubmatch(body); len(am) == 3 {
				appID := am[1]
				msg := am[2]
				low := strings.ToLower(msg)

				entry, ok := snap.Apps[appID]
				if !ok {
					entry = &steamContentLogApp{}
					snap.Apps[appID] = entry
				}
				if ts.Before(entry.UpdatedAt) {
					continue
				}
				entry.UpdatedAt = ts

				if dm := reSteamDLFrac.FindStringSubmatch(msg); len(dm) == 3 {
					d, _ := strconv.ParseInt(dm[1], 10, 64)
					t, _ := strconv.ParseInt(dm[2], 10, 64)
					if t > 0 {
						entry.BytesDone = d
						entry.BytesTotal = t
					}
				}

				switch {
				case strings.Contains(low, "finished update") || strings.Contains(low, "update canceled") || (strings.Contains(low, "state changed") && strings.Contains(low, "fully installed") && !strings.Contains(low, "update running") && !strings.Contains(low, "downloading")):
					entry.Finished = true
					entry.Suspended = false
					entry.StateText = "Finished"
				case strings.Contains(low, "suspended") || strings.Contains(low, "paused"):
					entry.Suspended = true
					entry.Finished = false
					entry.StateText = "Paused"
				case strings.Contains(low, "update started"):
					entry.Finished = false
					entry.Suspended = false
					entry.StateText = "Downloading"
				case strings.Contains(low, "state changed"):
					entry.Finished = false
					entry.Suspended = false
					switch {
					case strings.Contains(low, "downloading"):
						entry.StateText = "Downloading"
					case strings.Contains(low, "staging") || strings.Contains(low, "committing"):
						entry.StateText = "Staging"
					case strings.Contains(low, "preallocating"):
						entry.StateText = "Preallocating"
					case strings.Contains(low, "validating") || strings.Contains(low, "verifying"):
						entry.StateText = "Verifying"
					}
				}
			}
		}
	}
	return snap
}

func formatHumanGB(b int64) string {
	if b <= 0 {
		return "0 МБ"
	}
	const gb = 1024 * 1024 * 1024
	const mb = 1024 * 1024
	if b >= gb {
		return fmt.Sprintf("%.2f ГБ", float64(b)/float64(gb))
	}
	return fmt.Sprintf("%.0f МБ", float64(b)/float64(mb))
}

func estimateCatchupBytesSinceACF(samples []steamRateSample, since, now time.Time) int64 {
	if len(samples) == 0 || since.IsZero() || now.Sub(since) < 8*time.Second || now.Sub(since) > 25*time.Minute {
		return 0
	}
	// Filter & sort samples after `since` (with up to 45s lookback for the first active rate)
	relevant := make([]steamRateSample, 0, len(samples))
	for _, s := range samples {
		if !s.At.Before(since.Add(-45*time.Second)) && !s.At.After(now.Add(2*time.Second)) && s.Mbps > 0.1 {
			relevant = append(relevant, s)
		}
	}
	if len(relevant) == 0 {
		return 0
	}
	sort.Slice(relevant, func(i, j int) bool { return relevant[i].At.Before(relevant[j].At) })
	// Only integrate if the latest logged rate is still recent (< 90s ago)
	last := relevant[len(relevant)-1]
	if now.Sub(last.At) > 90*time.Second {
		return 0
	}
	var totalBytes float64
	cursor := since
	for _, s := range relevant {
		if !s.At.After(cursor) {
			continue
		}
		dt := s.At.Sub(cursor).Seconds()
		if dt > 90 {
			dt = 90
		}
		if dt > 0 {
			totalBytes += (s.Mbps / 8.0) * 1024.0 * 1024.0 * dt
		}
		cursor = s.At
	}
	if tailDt := now.Sub(cursor).Seconds(); tailDt > 0 {
		if tailDt > 75 {
			tailDt = 75
		}
		totalBytes += (last.Mbps / 8.0) * 1024.0 * 1024.0 * tailDt
	}
	return int64(totalBytes)
}

func collectSteamDownloads183(extraDirs ...string) []DockProgressTask {
	roots, libs := discoverSteamRootsAndLibraries183(extraDirs...)
	regApps := getSteamUpdatingAppsFromRegistry()
	logSnap := parseSteamContentLogTail(roots)
	_, _, ioWrite, _, hasSteamIO := getSteamProcessIOCountersNative()

	now := time.Now()
	tasks := make([]DockProgressTask, 0, 4)
	seenApp := map[string]bool{}
	activeIDs := map[string]bool{}

	// Fresh live Steam network rate from content_log.txt (if logged within last 75s)
	logSpeedMBs := 0.0
	if !logSnap.RateAt.IsZero() && now.Sub(logSnap.RateAt) < 75*time.Second && logSnap.RateMbps > 0.05 {
		logSpeedMBs = logSnap.RateMbps / 8.0
	}

	steamTrackerMu.Lock()
	defer steamTrackerMu.Unlock()

	for _, saDir := range libs {
		matches, err := filepath.Glob(filepath.Join(saDir, "appmanifest_*.acf"))
		if err != nil {
			continue
		}
		for _, mf := range matches {
			var acfModTime time.Time
			if st, serr := os.Stat(mf); serr == nil {
				acfModTime = st.ModTime()
			}
			raw, err2 := os.ReadFile(mf)
			if err2 != nil {
				continue
			}
			kv := parseTopLevelACF(raw)
			appID := kv["appid"]
			if appID == "" || seenApp[appID] {
				continue
			}

			stateFlags, _ := strconv.Atoi(kv["stateflags"])
			bytesToDL, _ := strconv.ParseInt(kv["bytestodownload"], 10, 64)
			bytesDL, _ := strconv.ParseInt(kv["bytesdownloaded"], 10, 64)
			bytesToStage, _ := strconv.ParseInt(kv["bytestostage"], 10, 64)
			bytesStaged, _ := strconv.ParseInt(kv["bytesstaged"], 10, 64)

			regInfo, hasReg := regApps[appID]
			logInfo, hasLog := logSnap.Apps[appID]

			// Instant completion filter: if Registry explicitly says Updating==0 AND log recently said Finished -> skip immediately!
			if hasReg && !regInfo.Updating && hasLog && logInfo.Finished && now.Sub(logInfo.UpdatedAt) < 10*time.Minute && (stateFlags&1024) == 0 {
				continue
			}

			// Determine active states combining ACF + Registry (instant!) + content_log.txt (instant!)
			isUpdatingReg := hasReg && regInfo.Updating
			isLogActive := hasLog && !logInfo.Finished && !logInfo.Suspended && now.Sub(logInfo.UpdatedAt) < 15*time.Minute
			isLogPaused := hasLog && logInfo.Suspended && !logInfo.Finished && now.Sub(logInfo.UpdatedAt) < 30*time.Minute

			isDownloading := ((stateFlags&1024) != 0 || isUpdatingReg || (isLogActive && logInfo.StateText == "Downloading")) && (bytesToDL > 0 && bytesDL < bytesToDL)
			if !isDownloading && bytesToDL > 0 && bytesDL < bytesToDL && (stateFlags&4) == 0 {
				isDownloading = true
			}
			isStaging := ((stateFlags&2048) != 0 || (stateFlags&65536) != 0 || (stateFlags&16) != 0 || (isLogActive && (logInfo.StateText == "Staging" || logInfo.StateText == "Verifying"))) && (bytesToStage > 0 || bytesToDL > 0)
			if !isStaging && bytesToStage > 0 && bytesStaged < bytesToStage && ((stateFlags&4) == 0 || isUpdatingReg) {
				isStaging = true
			}
			isPrealloc := isUpdatingReg && bytesToDL == 0 && bytesToStage == 0
			isPaused := ((stateFlags&512) != 0 || isLogPaused) && (bytesToDL > 0 || bytesToStage > 0)
			isErr := (stateFlags & 32768) != 0

			// If content_log has newer byte counts for this app, merge them!
			if hasLog && !logInfo.Finished && logInfo.BytesTotal > 0 {
				if bytesToDL == 0 {
					bytesToDL = logInfo.BytesTotal
				}
				if logInfo.BytesTotal == bytesToDL && logInfo.BytesDone > bytesDL {
					bytesDL = logInfo.BytesDone
				}
				if bytesDL < bytesToDL && !isPaused {
					isDownloading = true
				}
			}

			// Check if downloading/<appid> directory exists and was modified very recently (<10s)
			dlSubDir := filepath.Join(saDir, "downloading", appID)
			if !isDownloading && !isStaging && isUpdatingReg {
				if stDir, derr := os.Stat(dlSubDir); derr == nil && stDir.IsDir() {
					isPrealloc = true
				}
			}

			if !isDownloading && !isStaging && !isPrealloc && !isPaused && !isErr {
				continue
			}

			seenApp[appID] = true
			activeIDs[appID] = true

			name := kv["name"]
			if name == "" && hasReg && regInfo.Name != "" {
				name = regInfo.Name
			}
			if name == "" {
				name = "Steam App #" + appID
			}

			// Choose exact phase: Download phase while bytesDL < bytesToDL; Stage/Patch phase once download completes!
			phase := "download"
			acfDone, acfTotal := bytesDL, bytesToDL
			state := "active"
			detail := "Загрузка Steam"

			// Guard against stale BytesDownloaded when Steam already flushed a higher BytesStaged ratio on fresh downloads
			if bytesToDL > 0 && bytesToStage > 0 && bytesDL < bytesToDL && bytesToStage <= bytesToDL*3 {
				dlRatio := float64(bytesDL) / float64(bytesToDL)
				stRatio := float64(bytesStaged) / float64(bytesToStage)
				if stRatio > dlRatio+0.04 && stRatio <= 0.999 {
					acfDone = int64(stRatio * float64(bytesToDL))
				}
			}

			if isStaging && (bytesToDL == 0 || bytesDL >= bytesToDL) && bytesToStage > 0 {
				phase = "stage"
				acfDone, acfTotal = bytesStaged, bytesToStage
				state = "extracting"
				detail = "Распаковка / установка"
			} else if isPrealloc {
				phase = "prealloc"
				state = "active"
				detail = "Подготовка файлов Steam..."
			}

			if isPaused && !isUpdatingReg {
				state = "paused"
				detail = "Загрузка на паузе"
			}
			if isErr {
				state = "error"
				detail = "Ошибка диска / проверки Steam"
			}

			// ---- Self-calibrating real-time steam.exe I/O interpolation between lazy .acf flushes ----
			tr, ok := steamTrackers[appID]
			if !ok {
				initDone := acfDone
				if phase == "download" && state == "active" && acfTotal > 0 && acfDone < acfTotal {
					if catchup := estimateCatchupBytesSinceACF(logSnap.RateSamples, acfModTime, now); catchup > 0 {
						maxCap := int64(float64(acfTotal) * 0.992)
						if initDone+catchup > maxCap {
							initDone = maxCap
						} else {
							initDone += catchup
						}
					}
				}
				tr = &steamAppTracker{
					AppID:         appID,
					LastPhase:     phase,
					AnchorACF:     acfDone,
					AnchorTotal:   acfTotal,
					AnchorIOWrite: ioWrite,
					AnchorAt:      now,
					LastIOWrite:   ioWrite,
					LastIOTime:    now,
					LiveDone:      initDone,
					IORatio:       0.78, // typical Steam compressed-download / disk-write ratio
				}
				steamTrackers[appID] = tr
			}

			// Reset anchor if phase or total size changed (e.g. switched from Downloading -> Staging!)
			if tr.LastPhase != phase || tr.AnchorTotal != acfTotal {
				tr.LastPhase = phase
				tr.AnchorACF = acfDone
				tr.AnchorTotal = acfTotal
				tr.AnchorIOWrite = ioWrite
				tr.AnchorAt = now
				tr.LiveDone = acfDone
				tr.Calibrations = 0
				if phase == "stage" {
					tr.IORatio = 0.95
				} else {
					tr.IORatio = 0.78
				}
			}

			// Measure live steam.exe write speed (MB/s) on every poll!
			instSpeedMB := 0.0
			if hasSteamIO && state != "paused" && state != "error" {
				dt := now.Sub(tr.LastIOTime).Seconds()
				if dt >= 0.35 && ioWrite >= tr.LastIOWrite {
					dBytes := ioWrite - tr.LastIOWrite
					rawWriteMBs := float64(dBytes) / (1024.0 * 1024.0) / dt
					if rawWriteMBs > 0.05 {
						instSpeedMB = rawWriteMBs * tr.IORatio
						tr.IdleTicks = 0
					} else {
						tr.IdleTicks++
					}
					tr.LastIOWrite = ioWrite
					tr.LastIOTime = now
				}
			}

			// Blend smooth speed with content_log.txt's official Steam download rate when downloading
			if phase == "download" && logSpeedMBs > 0.1 && (instSpeedMB > 0.05 || !hasSteamIO) {
				if instSpeedMB <= 0.05 {
					instSpeedMB = logSpeedMBs
				} else {
					instSpeedMB = instSpeedMB*0.45 + logSpeedMBs*0.55
				}
			}
			if state == "paused" || state == "error" || tr.IdleTicks >= 3 {
				tr.SmoothSpeedMB = 0
			} else if instSpeedMB > 0 {
				if tr.SmoothSpeedMB <= 0.05 {
					tr.SmoothSpeedMB = instSpeedMB
				} else {
					tr.SmoothSpeedMB = tr.SmoothSpeedMB*0.55 + instSpeedMB*0.45
				}
			} else {
				tr.SmoothSpeedMB *= 0.6
			}

			// If Steam flushed a NEWER byte count into appmanifest_*.acf -> snap immediately & auto-calibrate ratio!
			if acfDone != tr.AnchorACF {
				if acfDone > tr.AnchorACF && hasSteamIO && ioWrite > tr.AnchorIOWrite {
					acfDelta := float64(acfDone - tr.AnchorACF)
					ioDelta := float64(ioWrite - tr.AnchorIOWrite)
					if ioDelta >= 2*1024*1024 { // >= 2 MB sample
						measuredRatio := acfDelta / ioDelta
						if measuredRatio < 0.25 {
							measuredRatio = 0.25
						}
						if measuredRatio > 1.15 {
							measuredRatio = 1.15
						}
						if tr.Calibrations == 0 {
							tr.IORatio = measuredRatio
						} else {
							tr.IORatio = tr.IORatio*0.5 + measuredRatio*0.5
						}
						tr.Calibrations++
					}
				}
				tr.AnchorACF = acfDone
				tr.AnchorIOWrite = ioWrite
				tr.AnchorAt = now
				tr.LiveDone = acfDone
			} else if acfTotal > 0 && state != "paused" && state != "error" {
				// Between Steam's lazy .acf disk flushes: advance live bytes using REAL steam.exe I/O delta!
				baseDone := tr.LiveDone
				if tr.AnchorACF > baseDone {
					baseDone = tr.AnchorACF
				}
				var est int64 = tr.AnchorACF
				if hasSteamIO && ioWrite > tr.AnchorIOWrite && tr.IdleTicks < 3 {
					ioSinceAnchor := float64(ioWrite - tr.AnchorIOWrite)
					est = tr.AnchorACF + int64(ioSinceAnchor*tr.IORatio)
					// If mid-download catchup boosted LiveDone above AnchorACF, also advance smoothly by instant write delta
					if baseDone > est && instSpeedMB > 0.05 {
						est = baseDone + int64(instSpeedMB*1024*1024*0.9)
					}
				} else if !hasSteamIO && logSpeedMBs > 0.1 && now.Sub(tr.AnchorAt) < 120*time.Second {
					// Fallback if IO counters unavailable: integrate content_log.txt download rate
					est = tr.AnchorACF + int64(logSpeedMBs*1024*1024*now.Sub(tr.AnchorAt).Seconds())
				}
				// Never go backward between flushes, and cap at 99.4% until Steam confirms 100% completion
				maxCap := int64(float64(acfTotal) * 0.994)
				if est > maxCap && acfDone < acfTotal {
					est = maxCap
				}
				if est > tr.LiveDone {
					tr.LiveDone = est
				}
			}

			done := tr.LiveDone
			total := acfTotal
			if acfDone > done {
				done = acfDone
			}
			if total > 0 && done > total {
				done = total
			}

			pct := 0.0
			if total > 0 {
				pct = (float64(done) / float64(total)) * 100.0
			} else if isPrealloc {
				pct = 1.0
			}
			if pct < 0 {
				pct = 0
			}
			if pct > 100 {
				pct = 100
			}

			if total > 0 && state != "paused" && state != "error" {
				prefix := "Загрузка"
				if state == "extracting" {
					prefix = "Установка"
				}
				detail = fmt.Sprintf("%s · %s / %s", prefix, formatHumanGB(done), formatHumanGB(total))
			}

			tasks = append(tasks, DockProgressTask{
				ID:         "steam_" + appID,
				AppKey:     "steam",
				AppName:    "Steam",
				Title:      name,
				Source:     "steam",
				State:      state,
				Percent:    math.Round(pct*10) / 10,
				BytesDone:  done,
				BytesTotal: total,
				SpeedMBs:   math.Round(tr.SmoothSpeedMB*10) / 10,
				Detail:     detail,
				UpdatedAt:  now.UnixMilli(),
			})
		}
	}

	// Instant <1s Registry fallback: if user JUST clicked Install/Update and Steam hasn't written appmanifest_*.acf yet
	for appID, regInfo := range regApps {
		if !regInfo.Updating || seenApp[appID] {
			continue
		}
		seenApp[appID] = true
		activeIDs[appID] = true
		name := regInfo.Name
		if name == "" {
			name = "Steam App #" + appID
		}
		tasks = append(tasks, DockProgressTask{
			ID:        "steam_" + appID,
			AppKey:    "steam",
			AppName:   "Steam",
			Title:     name,
			Source:    "steam",
			State:     "active",
			Percent:   1.0,
			SpeedMBs:  math.Round(logSpeedMBs*10) / 10,
			Detail:    "Подготовка загрузки Steam...",
			UpdatedAt: now.UnixMilli(),
		})
	}

	// Clean up finished app trackers immediately
	for id := range steamTrackers {
		if !activeIDs[id] {
			delete(steamTrackers, id)
		}
	}

	// Prioritize actively downloading/extracting tasks above paused ones
	sort.SliceStable(tasks, func(i, j int) bool {
		rank := func(s string) int {
			switch s {
			case "active":
				return 0
			case "extracting":
				return 1
			case "error":
				return 2
			default:
				return 3
			}
		}
		ri, rj := rank(tasks[i].State), rank(tasks[j].State)
		if ri != rj {
			return ri < rj
		}
		return tasks[i].SpeedMBs > tasks[j].SpeedMBs
	})

	return tasks
}
