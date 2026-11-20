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

type HostHardwareSnapshot struct {
	Hostname            string           `json:"hostname"`
	DeviceModel         string           `json:"device_model"`
	Manufacturer        string           `json:"manufacturer"`
	KernelEngineVersion string           `json:"kernel_engine_version"`
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
