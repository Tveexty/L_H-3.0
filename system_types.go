package main

type DiskMetric struct {
	Mount   string  `json:"mount"`
	Label   string  `json:"label"`
	UsedGB  float64 `json:"used_gb"`
	TotalGB float64 `json:"total_gb"`
	FreeGB  float64 `json:"free_gb"`
	Percent int     `json:"percent"`
}

type MediaSessionInfo struct {
	Available bool   `json:"available"`
	IsPlaying bool   `json:"is_playing"`
	Title     string `json:"title"`
	Artist    string `json:"artist"`
	SourceApp string `json:"source_app"`
	UpdatedAt int64  `json:"updated_at"`
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
	PID       int     `json:"pid"`
	Name      string  `json:"name"`
	Title     string  `json:"title,omitempty"`
	HasWindow bool    `json:"has_window"`
	Status    string  `json:"status"`
	CPUPct    float64 `json:"cpu_pct"`
	MemMB     float64 `json:"mem_mb"`
	ExePath   string  `json:"exe_path,omitempty"`
	IsSelf    bool    `json:"is_self,omitempty"`
}

type HostWindowItem struct {
	PID     int     `json:"pid"`
	Name    string  `json:"name"`
	Title   string  `json:"title"`
	MemMB   float64 `json:"mem_mb"`
	ExePath string  `json:"exe_path,omitempty"`
	IsSelf  bool    `json:"is_self,omitempty"`
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
	Name      string `json:"name"`
	Status    string `json:"status"`
	Connected bool   `json:"connected"`
	Class     string `json:"class"`
}

type BluetoothStatus struct {
	Available   bool              `json:"available"`
	Enabled     bool              `json:"enabled"`
	AdapterName string            `json:"adapter_name"`
	Devices     []BluetoothDevice `json:"devices"`
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
	OK             bool   `json:"ok"`
	HasUpdate      bool   `json:"has_update"`
	CurrentVersion string `json:"current_version"`
	CurrentName    string `json:"current_name"`
	LatestVersion  string `json:"latest_version"`
	LatestTag      string `json:"latest_tag"`
	ReleaseTitle   string `json:"release_title"`
	ReleaseNotes   string `json:"release_notes"`
	ReleaseURL     string `json:"release_url"`
	DownloadURL    string `json:"download_url"`
	PublishedAt    string `json:"published_at"`
	AssetSize      int64  `json:"asset_size"`
	CheckedAt      string `json:"checked_at"`
	Error          string `json:"error,omitempty"`
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
