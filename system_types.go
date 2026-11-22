package main

import "strings"

type DiskMetric struct {
	Mount   string  `json:"mount"`
	Label   string  `json:"label"`
	UsedGB  float64 `json:"used_gb"`
	TotalGB float64 `json:"total_gb"`
	FreeGB  float64 `json:"free_gb"`
	Percent int     `json:"percent"`
}

type MediaSessionItem struct {
	ID          string `json:"id"`
	SourceApp   string `json:"source_app"`
	DisplayName string `json:"display_name"`
	Title       string `json:"title"`
	Artist      string `json:"artist"`
	IsPlaying   bool   `json:"is_playing"`
	IsCurrent   bool   `json:"is_current"`
}

type MediaSessionInfo struct {
	Available bool               `json:"available"`
	IsPlaying bool               `json:"is_playing"`
	Title     string             `json:"title"`
	Artist    string             `json:"artist"`
	SourceApp string             `json:"source_app"`
	UpdatedAt int64              `json:"updated_at"`
	Sessions  []MediaSessionItem `json:"sessions,omitempty"`
}

type LocationInfo struct {
	Detected  bool    `json:"detected"`
	City      string  `json:"city"`
	Region    string  `json:"region"`
	Country   string  `json:"country"`
	Timezone  string  `json:"timezone"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	IP        string  `json:"ip"`
	Source    string  `json:"source"`
}

type ProcessMetric struct {
	PID          int     `json:"pid"`
	Name         string  `json:"name"`
	FriendlyName string  `json:"friendly_name,omitempty"`
	Title        string  `json:"title,omitempty"`
	Description  string  `json:"description,omitempty"`
	Category     string  `json:"category,omitempty"` // app | background | system
	HasWindow    bool    `json:"has_window"`
	Status       string  `json:"status"`
	CPUPct       float64 `json:"cpu_pct"`
	MemMB        float64 `json:"mem_mb"`
	PrivateMB    float64 `json:"private_mb,omitempty"`
	Threads      int     `json:"threads,omitempty"`
	ExePath      string  `json:"exe_path,omitempty"`
	IsSelf       bool    `json:"is_self,omitempty"`
}

type HostWindowItem struct {
	PID          int     `json:"pid"`
	Name         string  `json:"name"`
	FriendlyName string  `json:"friendly_name,omitempty"`
	Title        string  `json:"title"`
	MemMB        float64 `json:"mem_mb"`
	ExePath      string  `json:"exe_path,omitempty"`
	IconURL      string  `json:"icon_url,omitempty"`
	IsSelf       bool    `json:"is_self,omitempty"`
}

type QuickFolderItem struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Kind string `json:"kind"`
}

type FsEntry struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	IsDir    bool   `json:"is_dir"`
	Size     int64  `json:"size"`
	ModTime  string `json:"mod_time"`
	Ext      string `json:"ext"`
	IsHidden bool   `json:"is_hidden"`
}

type PickedFileInfo struct {
	Picked bool   `json:"picked"`
	Path   string `json:"path"`
	Name   string `json:"name"`
	Ext    string `json:"ext"`
	IsDir  bool   `json:"is_dir"`
	Size   int64  `json:"size"`
}

type BluetoothDevice struct {
	Name           string `json:"name"`
	Status         string `json:"status"`
	Connected      bool   `json:"connected"`
	Class          string `json:"class"`
	BatteryPercent int    `json:"battery_percent"` // -1 if unknown, 0-100 if reported
	DeviceType     string `json:"device_type"`     // mouse | keyboard | headphones | gamepad | watch | phone | other
	Transport      string `json:"transport,omitempty"`
	InstanceID     string `json:"instance_id,omitempty"`
}

type BluetoothStatus struct {
	Available   bool              `json:"available"`
	Enabled     bool              `json:"enabled"`
	AdapterName string            `json:"adapter_name"`
	Devices     []BluetoothDevice `json:"devices"`
}

type WirelessDeviceBattery struct {
	Name           string `json:"name"`
	DeviceType     string `json:"device_type"` // mouse | keyboard | headphones | gamepad | watch | phone | other
	BatteryPercent int    `json:"battery_percent"`
	Connected      bool   `json:"connected"`
	Transport      string `json:"transport"`
	Source         string `json:"source"`
	VendorID       string `json:"vendor_id,omitempty"`
	ProductID      string `json:"product_id,omitempty"`
	Manufacturer   string `json:"manufacturer,omitempty"`
	IsMouse        bool   `json:"is_mouse,omitempty"`
}

type MouseDPIConfig struct {
	OK                bool    `json:"ok"`
	WindowsSpeed      int     `json:"windows_speed"`      // 1..20 (10 = 1.0x)
	SensorDPI         int     `json:"sensor_dpi"`         // Native hardware DPI (400..25600)
	EffectiveDPI      int     `json:"effective_dpi"`      // Effective cursor DPI (eDPI)
	Multiplier        float64 `json:"multiplier"`         // Exact Windows pointer speed factor
	EnhancePrecision  bool    `json:"enhance_precision"`  // Mouse acceleration on/off
	ScrollLines       int     `json:"scroll_lines"`       // Wheel scroll lines (1..20)
	DetectedMouseName string  `json:"detected_mouse_name"`
	Platform          string  `json:"platform"`
}

type DeveloperThemeItem struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Author         string `json:"author,omitempty"`
	Version        string `json:"version,omitempty"`
	Description    string `json:"description,omitempty"`
	IsDark         bool   `json:"isDark"`
	BgGradient     string `json:"bgGradient"`
	SurfaceRgba    string `json:"surfaceRgba"`
	SurfaceRgb     string `json:"surfaceRgb,omitempty"`
	CardRgb        string `json:"cardRgb,omitempty"`
	BarRgb         string `json:"barRgb,omitempty"`
	CardHex        string `json:"cardHex"`
	Accent         string `json:"accent"`
	AccentHex      string `json:"accentHex"`
	AccentHoverHex string `json:"accentHoverHex,omitempty"`
	Custom         bool   `json:"custom"`
	CreatedAt      string `json:"created_at,omitempty"`
}

type DeveloperPluginItem struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Version     string   `json:"version"`
	APIVersion  string   `json:"apiVersion"`
	Author      string   `json:"author"`
	Category    string   `json:"category"`
	Icon        string   `json:"icon"`
	Description string   `json:"description"`
	Enabled     bool     `json:"enabled"`
	File        string   `json:"file"`
	Hooks       []string `json:"hooks"`
	Permissions []string `json:"permissions,omitempty"`
	ActionID    string   `json:"actionId,omitempty"`
	Script      string   `json:"script,omitempty"`
	CustomCSS   string   `json:"customCss,omitempty"`
	CreatedAt   string   `json:"created_at,omitempty"`
}

type HostsAuditEntry struct {
	Line       int    `json:"line"`
	IP         string `json:"ip"`
	Host       string `json:"host"`
	Suspicious bool   `json:"suspicious"`
	Reason     string `json:"reason"`
}

type HostsAuditResult struct {
	OK              bool              `json:"ok"`
	Path            string            `json:"path"`
	TotalMappings   int               `json:"total_mappings"`
	SuspiciousCount int               `json:"suspicious_count"`
	Entries         []HostsAuditEntry `json:"entries"`
	CheckedAt       string            `json:"checked_at"`
}

type AudioEndpointDevice struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Kind       string `json:"kind"` // output | input
	IsDefault  bool   `json:"is_default"`
	Status     string `json:"status"`
	FormFactor string `json:"form_factor"` // speakers | headphones | headset | hdmi | mic | usb | bluetooth
}

type AudioDevicesSnapshot struct {
	OK             bool                  `json:"ok"`
	Outputs        []AudioEndpointDevice `json:"outputs"`
	Inputs         []AudioEndpointDevice `json:"inputs"`
	ActiveOutputID string                `json:"active_output_id"`
	ActiveInputID  string                `json:"active_input_id"`
}

type KeyboardLayoutInfo struct {
	Tag        string `json:"tag"`         // e.g. ru-RU, en-US, ro-RO
	Short      string `json:"short"`       // e.g. RUS, ENG, ROM
	Name       string `json:"name"`        // e.g. Русский
	NativeName string `json:"native_name"` // e.g. Русский
	HKL        string `json:"hkl,omitempty"`
	Active     bool   `json:"active"`
}

type KeyboardLayoutsSnapshot struct {
	OK        bool                 `json:"ok"`
	ActiveTag string               `json:"active_tag"`
	Active    KeyboardLayoutInfo   `json:"active"`
	Installed []KeyboardLayoutInfo `json:"installed"`
}

type InstalledAppItem struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	ExecPath  string `json:"exec_path"`
	Publisher string `json:"publisher,omitempty"`
	Category  string `json:"category"`
	Source    string `json:"source"` // start_menu | registry | desktop | system
	IconHint  string `json:"icon_hint"`
	IconURL   string `json:"icon_url,omitempty"`
}

type ActiveTcpConnection struct {
	LocalAddr   string `json:"local_addr"`
	RemoteAddr  string `json:"remote_addr"`
	State       string `json:"state"`
	PID         int    `json:"pid"`
	ProcessName string `json:"process_name"`
	Suspicious  bool   `json:"suspicious"`
	Note        string `json:"note,omitempty"`
}

type FileStatInfo struct {
	Exists     bool   `json:"exists"`
	Path       string `json:"path"`
	Name       string `json:"name"`
	IsDir      bool   `json:"is_dir"`
	SizeBytes  int64  `json:"size_bytes"`
	SizeHuman  string `json:"size_human"`
	ModifiedAt string `json:"modified_at"`
}

type ShellModeConfig struct {
	StartFullscreen    bool   `json:"start_fullscreen"`
	AutostartWithOS    bool   `json:"autostart_with_os"`
	HideWindowsTaskbar bool   `json:"hide_windows_taskbar"`
	ReserveWorkArea    bool   `json:"reserve_work_area"`
	AlwaysOnTop        bool   `json:"always_on_top"`
	TaskbarPosition    string `json:"taskbar_position"`
	TaskbarSizePx      int    `json:"taskbar_size_px"`
}

type SystemServiceInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Status      string `json:"status"` // Running | Stopped | Paused
	StartType   string `json:"start_type"`
	Source      string `json:"source"` // luma | os
	PID         int    `json:"pid,omitempty"`
	Description string `json:"description,omitempty"`
}

type StartupEntry struct {
	Name     string `json:"name"`
	Command  string `json:"command"`
	Location string `json:"location"`
	Enabled  bool   `json:"enabled"`
	Impact   string `json:"impact"`
}

type DefenderStatus struct {
	Available        bool   `json:"available"`
	RealtimeEnabled  bool   `json:"realtime_enabled"`
	AntivirusEnabled bool   `json:"antivirus_enabled"`
	SignatureVersion string `json:"signature_version"`
	CompatibleNote   string `json:"compatible_note"`
	ConflictFree     bool   `json:"conflict_free"`
}

type SecurityThreat struct {
	ID         string `json:"id"`
	Path       string `json:"path"`
	Name       string `json:"name"`
	Severity   string `json:"severity"` // high | medium | low
	Category   string `json:"category"`
	Reason     string `json:"reason"`
	SHA256     string `json:"sha256"`
	Size       int64  `json:"size"`
	DetectedAt string `json:"detected_at"`
}

type QuarantineItem struct {
	ID             string `json:"id"`
	OriginalPath   string `json:"original_path"`
	OriginalName   string `json:"original_name"`
	QuarantineFile string `json:"quarantine_file"`
	Reason         string `json:"reason"`
	Severity       string `json:"severity"`
	SHA256         string `json:"sha256"`
	QuarantinedAt  string `json:"quarantined_at"`
	Size           int64  `json:"size"`
}

type SecurityAuditEvent struct {
	ID       string `json:"id"`
	Time     string `json:"time"`
	Level    string `json:"level"` // info | ok | warn | danger
	Category string `json:"category"`
	Action   string `json:"action"`
	Detail   string `json:"detail"`
}

type UpdateCheckResult struct {
	OK                  bool     `json:"ok"`
	HasUpdate           bool     `json:"has_update"`
	CurrentVersion      string   `json:"current_version"`
	CurrentName         string   `json:"current_name"`
	LatestVersion       string   `json:"latest_version"`
	LatestTag           string   `json:"latest_tag"`
	UpdateLevel         string   `json:"update_level"`       // major | minor | patch | none
	UpdateLevelLabel    string   `json:"update_level_label"` // Глобальное обновление | Большое обновление | Патч исправлений
	ReleaseTitle        string   `json:"release_title"`
	ReleaseNotes        string   `json:"release_notes"`
	ChangelogHighlights []string `json:"changelog_highlights,omitempty"`
	ReleaseURL          string   `json:"release_url"`
	DownloadURL         string   `json:"download_url"`
	PublishedAt         string   `json:"published_at"`
	AssetSize           int64    `json:"asset_size"`
	CheckedAt           string   `json:"checked_at"`
	Error               string   `json:"error,omitempty"`
}

type UpdateProgressState struct {
	Running         bool    `json:"running"`
	Stage           string  `json:"stage"` // idle | checking | downloading | verifying | installing | restarting | done | error
	Percent         int     `json:"percent"`
	DownloadedBytes int64   `json:"downloaded_bytes"`
	TotalBytes      int64   `json:"total_bytes"`
	SpeedMbps       float64 `json:"speed_mbps"`
	TargetVersion   string  `json:"target_version"`
	FilePath        string  `json:"file_path,omitempty"`
	SHA256          string  `json:"sha256,omitempty"`
	Message         string  `json:"message"`
	Error           string  `json:"error,omitempty"`
}

type HostHardwareSnapshot struct {
	Hostname            string           `json:"hostname"`
	DeviceModel         string           `json:"device_model"`
	Manufacturer        string           `json:"manufacturer"`
	KernelEngineVersion string           `json:"kernel_engine_version"`
	SecurityCoreVersion string           `json:"security_core_version"`
	AppCodename         string           `json:"app_codename"`
	OSName              string           `json:"os_name"`
	Arch                string           `json:"arch"`
	CPUModel            string           `json:"cpu_model"`
	CPUCores            int              `json:"cpu_cores"`
	CPUPercent          int              `json:"cpu_percent"`
	GPUName             string           `json:"gpu_name"`
	GPUPercent          int              `json:"gpu_percent"`
	GPUTempC            int              `json:"gpu_temp_c"`
	GPUVramUsedMB       int              `json:"gpu_vram_used_mb"`
	GPUVramTotalMB      int              `json:"gpu_vram_total_mb"`
	GPUVramPercent      int              `json:"gpu_vram_percent"`
	GPUSource           string           `json:"gpu_source,omitempty"`
	ActiveKbdTag        string           `json:"active_kbd_tag,omitempty"`
	ActiveKbdShort      string           `json:"active_kbd_short,omitempty"`
	RAMUsedGB           float64          `json:"ram_used_gb"`
	RAMTotalGB          float64          `json:"ram_total_gb"`
	RAMPercent          int              `json:"ram_percent"`
	BatteryPresent      bool             `json:"battery_present"`
	BatteryPercent      int              `json:"battery_percent"`
	BatteryCharging     bool             `json:"battery_charging"`
	NetDownMbps         float64          `json:"net_down_mbps"`
	NetUpMbps           float64          `json:"net_up_mbps"`
	Disks               []DiskMetric     `json:"disks"`
	Media               MediaSessionInfo `json:"media"`
	Location            LocationInfo     `json:"location"`
	RealTelemetry       bool             `json:"real_telemetry"`
}

type BatteryHardwareDetails struct {
	Present               bool    `json:"present"`
	Percent               int     `json:"percent"`
	Charging              bool    `json:"charging"`
	ACOnline              bool    `json:"ac_online"`
	HealthPercent         int     `json:"health_percent"`
	DesignCapacityMWh     int     `json:"design_capacity_mwh"`
	FullChargeCapacityMWh int     `json:"full_charge_capacity_mwh"`
	CycleCount            int     `json:"cycle_count"`
	CycleSupported        bool    `json:"cycle_supported"`
	PowerWatts            float64 `json:"power_watts"`
	VoltageMV             int     `json:"voltage_mv"`
	EstimatedMinutes      int     `json:"estimated_minutes"`
	StatusText            string  `json:"status_text"`
	Chemistry             string  `json:"chemistry"`
	Manufacturer          string  `json:"manufacturer,omitempty"`
	DataSource            string  `json:"data_source,omitempty"`
}

type HardwareDeviceInfo struct {
	Name         string `json:"name"`
	Class        string `json:"class"`
	Status       string `json:"status"`
	Manufacturer string `json:"manufacturer"`
	InstanceID   string `json:"instance_id,omitempty"`
}

type NetworkAdapterInfo struct {
	Name   string `json:"name"`
	IPv4   string `json:"ipv4"`
	IPv6   string `json:"ipv6,omitempty"`
	MAC    string `json:"mac"`
	Up     bool   `json:"up"`
	Speed  string `json:"speed,omitempty"`
}

type FirewallProfileInfo struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

// friendlyAppName maps raw OS process executables (chrome, steamwebhelper, telegram...) to crisp user-facing app labels.
func friendlyAppName(procName, title string) string {
	raw := strings.TrimSpace(procName)
	lower := strings.ToLower(strings.TrimSuffix(raw, ".exe"))
	known := map[string]string{
		"chrome":             "Chrome",
		"msedge":             "Edge",
		"firefox":            "Firefox",
		"opera":              "Opera",
		"brave":              "Brave",
		"browser":            "Яндекс Браузер",
		"vivaldi":            "Vivaldi",
		"steam":              "Steam",
		"steamwebhelper":     "Steam",
		"epicgameslauncher":  "Epic Games",
		"telegram":           "Telegram",
		"discord":            "Discord",
		"spotify":            "Spotify",
		"code":               "VS Code",
		"devenv":             "Visual Studio",
		"idea64":             "IntelliJ IDEA",
		"pycharm64":          "PyCharm",
		"webstorm64":         "WebStorm",
		"explorer":           "Проводник",
		"notepad":            "Блокнот",
		"notepad++":          "Notepad++",
		"winword":            "Word",
		"excel":              "Excel",
		"powerpnt":           "PowerPoint",
		"onenote":            "OneNote",
		"outlook":            "Outlook",
		"obs64":              "OBS Studio",
		"vlc":                "VLC",
		"photoshop":          "Photoshop",
		"figma":              "Figma",
		"blender":            "Blender",
		"notion":             "Notion",
		"slack":              "Slack",
		"whatsapp":           "WhatsApp",
		"viber":              "Viber",
		"skype":              "Skype",
		"zoom":               "Zoom",
		"windowsterminal":    "Терминал",
		"wt":                 "Терминал",
		"powershell":         "PowerShell",
		"pwsh":               "PowerShell",
		"cmd":                "Командная строка",
		"taskmgr":            "Диспетчер задач",
		"calc":               "Калькулятор",
		"calculatorapp":      "Калькулятор",
		"mspaint":            "Paint",
		"snippingtool":       "Ножницы",
		"anydesk":            "AnyDesk",
		"teamviewer":         "TeamViewer",
		"qbittorrent":        "qBittorrent",
		"utorrent":           "uTorrent",
		"winrar":             "WinRAR",
		"7zfm":               "7-Zip",
		"minecraftlauncher":  "Minecraft",
		"javaw":              "Java App",
		"cs2":                "CS2",
		"dota2":              "Dota 2",
	}
	if hit, ok := known[lower]; ok {
		return hit
	}
	// If it's ApplicationFrameHost (UWP wrapper), extract clean app name from title
	if lower == "applicationframehost" && strings.TrimSpace(title) != "" {
		t := strings.TrimSpace(title)
		if idx := strings.LastIndex(t, " - "); idx >= 0 && idx+3 < len(t) {
			return strings.TrimSpace(t[idx+3:])
		}
		return t
	}
	if raw == "" {
		return "App"
	}
	// Capitalize first letter nicely
	return strings.ToUpper(raw[:1]) + raw[1:]
}

func classifyPeripheralType(name string) string {
	low := strings.ToLower(name)
	switch {
	case strings.Contains(low, "mouse") || strings.Contains(low, "мыш") || strings.Contains(low, "g pro") ||
		strings.Contains(low, "deathadder") || strings.Contains(low, "viper") || strings.Contains(low, "mx master") ||
		strings.Contains(low, "mx anywhere") || strings.Contains(low, "superlight") || strings.Contains(low, "aerox") ||
		strings.Contains(low, "basilisk") || strings.Contains(low, "trackball") || strings.Contains(low, "trackpad"):
		return "mouse"
	case strings.Contains(low, "keyboard") || strings.Contains(low, "клавиатур") || strings.Contains(low, "keychron") ||
		strings.Contains(low, "mx keys") || strings.Contains(low, "blackwidow") || strings.Contains(low, "huntsman") ||
		strings.Contains(low, "apex pro") || strings.Contains(low, "k380") || strings.Contains(low, "kbd"):
		return "keyboard"
	case strings.Contains(low, "airpods") || strings.Contains(low, "buds") || strings.Contains(low, "headphone") ||
		strings.Contains(low, "headset") || strings.Contains(low, "наушн") || strings.Contains(low, "гарнит") ||
		strings.Contains(low, "wh-1000") || strings.Contains(low, "wf-1000") || strings.Contains(low, "bose") ||
		strings.Contains(low, "jbl") || strings.Contains(low, "marshall") || strings.Contains(low, "arctis") ||
		strings.Contains(low, "cloud") || strings.Contains(low, "beats") || strings.Contains(low, "sennheiser") ||
		strings.Contains(low, "audio") || strings.Contains(low, "speaker") || strings.Contains(low, "колонк"):
		return "headphones"
	case strings.Contains(low, "xbox") || strings.Contains(low, "dualsense") || strings.Contains(low, "dualshock") ||
		strings.Contains(low, "gamepad") || strings.Contains(low, "controller") || strings.Contains(low, "joy-con") ||
		strings.Contains(low, "геймпад") || strings.Contains(low, "pro controller"):
		return "gamepad"
	case strings.Contains(low, "watch") || strings.Contains(low, "band") || strings.Contains(low, "часы"):
		return "watch"
	case strings.Contains(low, "iphone") || strings.Contains(low, "galaxy") || strings.Contains(low, "pixel") ||
		strings.Contains(low, "xiaomi") || strings.Contains(low, "phone") || strings.Contains(low, "redmi"):
		return "phone"
	default:
		return "other"
	}
}

func classifyAudioFormFactor(name, kind string) string {
	low := strings.ToLower(name)
	if kind == "input" {
		if strings.Contains(low, "headset") || strings.Contains(low, "hands-free") || strings.Contains(low, "airpods") || strings.Contains(low, "buds") {
			return "headset"
		}
		if strings.Contains(low, "usb") || strings.Contains(low, "hyperx") || strings.Contains(low, "blue yeti") || strings.Contains(low, "fifine") || strings.Contains(low, "shure") {
			return "usb"
		}
		return "mic"
	}
	switch {
	case strings.Contains(low, "airpods") || strings.Contains(low, "buds") || strings.Contains(low, "bluetooth") || strings.Contains(low, "hands-free"):
		return "bluetooth"
	case strings.Contains(low, "headphone") || strings.Contains(low, "headset") || strings.Contains(low, "наушн") || strings.Contains(low, "ear"):
		return "headphones"
	case strings.Contains(low, "hdmi") || strings.Contains(low, "display") || strings.Contains(low, "nvidia") || strings.Contains(low, "amd") || strings.Contains(low, "monitor"):
		return "hdmi"
	case strings.Contains(low, "usb") || strings.Contains(low, "dac"):
		return "usb"
	default:
		return "speakers"
	}
}

func classifyInstalledAppCategory(name, publisher string) (string, string) {
	low := strings.ToLower(name + " " + publisher)
	switch {
	case strings.Contains(low, "chrome") || strings.Contains(low, "firefox") || strings.Contains(low, "edge") ||
		strings.Contains(low, "opera") || strings.Contains(low, "brave") || strings.Contains(low, "yandex") || strings.Contains(low, "vivaldi"):
		return "Браузеры", "Globe"
	case strings.Contains(low, "steam") || strings.Contains(low, "epic") || strings.Contains(low, "ubisoft") ||
		strings.Contains(low, "ea app") || strings.Contains(low, "battle.net") || strings.Contains(low, "minecraft") ||
		strings.Contains(low, "riot") || strings.Contains(low, "roblox") || strings.Contains(low, "xbox") || strings.Contains(low, "game"):
		return "Игры", "Gamepad2"
	case strings.Contains(low, "visual studio") || strings.Contains(low, "vs code") || strings.Contains(low, "jetbrains") ||
		strings.Contains(low, "pycharm") || strings.Contains(low, "intellij") || strings.Contains(low, "git") ||
		strings.Contains(low, "python") || strings.Contains(low, "node") || strings.Contains(low, "docker") ||
		strings.Contains(low, "postman") || strings.Contains(low, "terminal") || strings.Contains(low, "cursor"):
		return "Разработка", "Code2"
	case strings.Contains(low, "telegram") || strings.Contains(low, "discord") || strings.Contains(low, "whatsapp") ||
		strings.Contains(low, "viber") || strings.Contains(low, "skype") || strings.Contains(low, "zoom") ||
		strings.Contains(low, "slack") || strings.Contains(low, "teams"):
		return "Общение", "MessageSquare"
	case strings.Contains(low, "spotify") || strings.Contains(low, "vlc") || strings.Contains(low, "obs") ||
		strings.Contains(low, "photoshop") || strings.Contains(low, "premiere") || strings.Contains(low, "blender") ||
		strings.Contains(low, "figma") || strings.Contains(low, "audacity") || strings.Contains(low, "music") || strings.Contains(low, "video"):
		return "Медиа", "Music"
	case strings.Contains(low, "word") || strings.Contains(low, "excel") || strings.Contains(low, "powerpoint") ||
		strings.Contains(low, "office") || strings.Contains(low, "libreoffice") || strings.Contains(low, "notion") ||
		strings.Contains(low, "obsidian") || strings.Contains(low, "acrobat") || strings.Contains(low, "pdf"):
		return "Офис", "FileText"
	default:
		return "Утилиты", "AppWindow"
	}
}

func keyboardShortCode(tag string) string {
	clean := strings.TrimSpace(tag)
	if clean == "" {
		return "ENG"
	}
	base := strings.ToLower(strings.Split(clean, "-")[0])
	shortMap := map[string]string{
		"en": "ENG", "ru": "RUS", "ro": "ROM", "uk": "UKR", "de": "DEU", "fr": "FRA",
		"es": "ESP", "it": "ITA", "pt": "POR", "pl": "POL", "tr": "TUR", "zh": "中文",
		"ja": "JPN", "ko": "KOR", "ar": "ARA", "he": "HEB", "hi": "HIN", "kk": "KAZ",
		"uz": "UZB", "be": "BEL", "bg": "BUL", "cs": "CES", "sk": "SLK", "nl": "NLD",
		"sv": "SWE", "no": "NOR", "nb": "NOR", "fi": "FIN", "da": "DAN", "el": "ELL",
		"hu": "HUN", "sr": "SRP", "hr": "HRV", "vi": "VIE", "th": "THA", "id": "IND",
		"ms": "MSA", "fa": "FAS", "ka": "KAT", "hy": "HYE", "az": "AZE", "lt": "LIT",
		"lv": "LAV", "et": "EST", "mn": "MON", "bn": "BEN", "ur": "URD", "ta": "TAM",
	}
	if s, ok := shortMap[base]; ok {
		return s
	}
	up := strings.ToUpper(base)
	if len(up) > 3 {
		return up[:3]
	}
	return up
}
