export interface SystemDiagnostics {
  os_name: string;
  os_build: string;
  cpu_name: string;
  cpu_cores: string;
  ram_total_gb: number;
  ram_available_gb: number;
  ram_used_pct: number;
  gpu_name: string;
  gpu_driver_version: string;
  display_resolution: string;
  display_scale_pct: number;
  active_window_title: string;
  active_window_app: string;
  active_window_version: string;
  timestamp: string;
  compact_stamp: string;
  markdown_table: string;
}
