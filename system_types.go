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
	PID    int     `json:"pid"`
	Name   string  `json:"name"`
	CPUPct float64 `json:"cpu_pct"`
	MemMB  float64 `json:"mem_mb"`
}

type FsEntry struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"is_dir"`
	Size  int64  `json:"size"`
}

type PickedFileInfo struct {
	Picked bool   `json:"picked"`
	Path   string `json:"path"`
	Name   string `json:"name"`
	Ext    string `json:"ext"`
	IsDir  bool   `json:"is_dir"`
	Size   int64  `json:"size"`
}

type HostHardwareSnapshot struct {
	Hostname        string           `json:"hostname"`
	OSName          string           `json:"os_name"`
	Arch            string           `json:"arch"`
	CPUModel        string           `json:"cpu_model"`
	CPUCores        int              `json:"cpu_cores"`
	CPUPercent      int              `json:"cpu_percent"`
	GPUName         string           `json:"gpu_name"`
	GPUPercent      int              `json:"gpu_percent"`
	GPUTempC        int              `json:"gpu_temp_c"`
	RAMUsedGB       float64          `json:"ram_used_gb"`
	RAMTotalGB      float64          `json:"ram_total_gb"`
	RAMPercent      int              `json:"ram_percent"`
	BatteryPresent  bool             `json:"battery_present"`
	BatteryPercent  int              `json:"battery_percent"`
	BatteryCharging bool             `json:"battery_charging"`
	NetDownMbps     float64          `json:"net_down_mbps"`
	NetUpMbps       float64          `json:"net_up_mbps"`
	Disks           []DiskMetric     `json:"disks"`
	Media           MediaSessionInfo `json:"media"`
	Location        LocationInfo     `json:"location"`
	RealTelemetry   bool             `json:"real_telemetry"`
}
