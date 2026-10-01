use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAppInfo {
    pub app_name: String,
    pub window_title: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemDiagnostics {
    pub os_name: String,
    pub os_build: String,
    pub cpu_name: String,
    pub cpu_cores: String,
    pub ram_total_gb: f64,
    pub ram_available_gb: f64,
    pub ram_used_pct: u8,
    pub gpu_name: String,
    pub gpu_driver_version: String,
    pub display_resolution: String,
    pub display_scale_pct: u32,
    pub active_window_title: String,
    pub active_window_app: String,
    pub active_window_version: String,
    pub timestamp: String,
    pub compact_stamp: String,
    pub markdown_table: String,
    pub available_apps: Vec<OpenAppInfo>,
}

#[cfg(target_os = "windows")]
mod win_ops {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

    #[link(name = "user32")]
    extern "system" {
        fn GetForegroundWindow() -> *mut std::ffi::c_void;
        fn GetWindowTextW(hwnd: *mut std::ffi::c_void, lp_string: *mut u16, n_max_count: i32) -> i32;
        fn GetWindowTextLengthW(hwnd: *mut std::ffi::c_void) -> i32;
        fn GetWindowThreadProcessId(hwnd: *mut std::ffi::c_void, lpdw_process_id: *mut u32) -> u32;
        fn GetTopWindow(hwnd: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
        fn GetWindow(hwnd: *mut std::ffi::c_void, u_cmd: u32) -> *mut std::ffi::c_void;
        fn IsWindowVisible(hwnd: *mut std::ffi::c_void) -> i32;
        fn IsIconic(hwnd: *mut std::ffi::c_void) -> i32;
        fn GetClassNameW(hwnd: *mut std::ffi::c_void, lp_class_name: *mut u16, n_max_count: i32) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn OpenProcess(dw_desired_access: u32, b_inherit_handle: i32, dw_process_id: u32) -> *mut std::ffi::c_void;
        fn CloseHandle(h_object: *mut std::ffi::c_void) -> i32;
        fn QueryFullProcessImageNameW(
            h_process: *mut std::ffi::c_void,
            dw_flags: u32,
            lp_exe_name: *mut u16,
            lpdw_size: *mut u32,
        ) -> i32;
    }

    #[link(name = "version")]
    extern "system" {
        fn GetFileVersionInfoSizeW(lptstr_filename: *const u16, lpdw_handle: *mut u32) -> u32;
        fn GetFileVersionInfoW(
            lptstr_filename: *const u16,
            dw_handle: u32,
            dw_len: u32,
            lp_data: *mut std::ffi::c_void,
        ) -> i32;
        fn VerQueryValueW(
            p_block: *const std::ffi::c_void,
            lp_sub_block: *const u16,
            lplp_buffer: *mut *mut std::ffi::c_void,
            pu_len: *mut u32,
        ) -> i32;
    }

    #[repr(C)]
    struct VS_FIXEDFILEINFO {
        dw_signature: u32,
        dw_struc_version: u32,
        dw_file_version_ms: u32,
        dw_file_version_ls: u32,
        dw_product_version_ms: u32,
        dw_product_version_ls: u32,
        dw_file_flags_mask: u32,
        dw_file_flags: u32,
        dw_file_os: u32,
        dw_file_type: u32,
        dw_file_subtype: u32,
        dw_file_date_ms: u32,
        dw_file_date_ls: u32,
    }

    pub fn inspect_process(pid: u32) -> (String, String, bool) {
        if pid == 0 {
            return ("Application".to_string(), "".to_string(), false);
        }
        unsafe {
            // PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
            let h_proc = OpenProcess(0x1000, 0, pid);
            if h_proc.is_null() {
                return ("Application".to_string(), "".to_string(), false);
            }

            let mut path_buf = [0u16; 1024];
            let mut path_len = 1024u32;
            let mut exe_name = String::new();
            let mut version_str = String::new();
            let mut is_screencraft = false;

            if QueryFullProcessImageNameW(h_proc, 0, path_buf.as_mut_ptr(), &mut path_len) != 0 {
                let full_path = OsString::from_wide(&path_buf[..path_len as usize]);
                let path_str = full_path.to_string_lossy();
                if let Some(file_name) = std::path::Path::new(&*path_str).file_name() {
                    let name = file_name.to_string_lossy().to_string();
                    if name.to_lowercase().contains("screencraft") {
                        is_screencraft = true;
                    }
                    exe_name = friendly_app_name(&name);
                }

                // Query file version
                let mut zero = 0u32;
                let size = GetFileVersionInfoSizeW(path_buf.as_ptr(), &mut zero);
                if size > 0 {
                    let mut data = vec![0u8; size as usize];
                    if GetFileVersionInfoW(path_buf.as_ptr(), 0, size, data.as_mut_ptr() as *mut _) != 0 {
                        let sub_block: Vec<u16> = "\\\0".encode_utf16().collect();
                        let mut ptr = std::ptr::null_mut();
                        let mut out_len = 0u32;
                        if VerQueryValueW(
                            data.as_ptr() as *const _,
                            sub_block.as_ptr(),
                            &mut ptr,
                            &mut out_len,
                        ) != 0
                            && out_len >= std::mem::size_of::<VS_FIXEDFILEINFO>() as u32
                        {
                            let info = &*(ptr as *const VS_FIXEDFILEINFO);
                            let major = (info.dw_product_version_ms >> 16) & 0xffff;
                            let minor = info.dw_product_version_ms & 0xffff;
                            let build = (info.dw_product_version_ls >> 16) & 0xffff;
                            let patch = info.dw_product_version_ls & 0xffff;
                            version_str = format!("v{major}.{minor}.{build}.{patch}");
                        }
                    }
                }
            }
            CloseHandle(h_proc);

            if exe_name.is_empty() {
                exe_name = "Application".to_string();
            }

            (exe_name, version_str, is_screencraft)
        }
    }

    pub fn get_active_windows() -> (String, String, String, Vec<super::OpenAppInfo>) {
        unsafe {
            let my_pid = std::process::id();
            let mut target_hwnd: *mut std::ffi::c_void = std::ptr::null_mut();
            let mut open_apps: Vec<super::OpenAppInfo> = Vec::new();

            // 1. Check GetForegroundWindow() first
            let fg_hwnd = GetForegroundWindow();
            if !fg_hwnd.is_null() {
                let mut fg_pid = 0u32;
                GetWindowThreadProcessId(fg_hwnd, &mut fg_pid);
                if fg_pid != 0 && fg_pid != my_pid {
                    target_hwnd = fg_hwnd;
                }
            }

            // 2. Iterate top-level windows in Z-order to collect all open user applications
            const GW_HWNDNEXT: u32 = 2;
            let mut curr = if !fg_hwnd.is_null() {
                GetWindow(fg_hwnd, GW_HWNDNEXT)
            } else {
                GetTopWindow(std::ptr::null_mut())
            };

            let mut loop_count = 0;
            while !curr.is_null() && loop_count < 200 {
                loop_count += 1;

                // Must be visible
                if IsWindowVisible(curr) == 0 {
                    curr = GetWindow(curr, GW_HWNDNEXT);
                    continue;
                }

                // Must not be minimized
                if IsIconic(curr) != 0 {
                    curr = GetWindow(curr, GW_HWNDNEXT);
                    continue;
                }

                // Must have a title length > 0
                let tlen = GetWindowTextLengthW(curr);
                if tlen <= 0 {
                    curr = GetWindow(curr, GW_HWNDNEXT);
                    continue;
                }

                // Check PID
                let mut pid = 0u32;
                GetWindowThreadProcessId(curr, &mut pid);
                if pid == 0 || pid == my_pid {
                    curr = GetWindow(curr, GW_HWNDNEXT);
                    continue;
                }

                // Check Window Class to filter out Windows Shell & Desktop background elements
                let mut class_buf = [0u16; 256];
                let clen = GetClassNameW(curr, class_buf.as_mut_ptr(), 256);
                let class_name = if clen > 0 {
                    OsString::from_wide(&class_buf[..clen as usize])
                        .to_string_lossy()
                        .to_string()
                } else {
                    String::new()
                };

                let c_lower = class_name.to_lowercase();
                if c_lower.contains("shell_traywnd")
                    || c_lower.contains("progman")
                    || c_lower.contains("workerw")
                    || c_lower.contains("shell_secondarytraywnd")
                    || c_lower == "windows.ui.core.corewindow"
                {
                    curr = GetWindow(curr, GW_HWNDNEXT);
                    continue;
                }

                // Check Window Title
                let mut title_buf = [0u16; 512];
                let len = GetWindowTextW(curr, title_buf.as_mut_ptr(), 512);
                let title = if len > 0 {
                    OsString::from_wide(&title_buf[..len as usize])
                        .to_string_lossy()
                        .to_string()
                } else {
                    String::new()
                };

                let t_lower = title.to_lowercase();
                if title.is_empty()
                    || t_lower == "program manager"
                    || t_lower == "windows shell experience host"
                    || t_lower == "task switching"
                    || t_lower.contains("screencraft")
                {
                    curr = GetWindow(curr, GW_HWNDNEXT);
                    continue;
                }

                // Verify executable is not screencraft
                let (exe_name, version_str, is_screencraft) = inspect_process(pid);
                if is_screencraft || exe_name.to_lowercase().contains("screencraft") {
                    curr = GetWindow(curr, GW_HWNDNEXT);
                    continue;
                }

                if target_hwnd.is_null() {
                    target_hwnd = curr;
                }

                if !open_apps.iter().any(|a| a.app_name == exe_name) {
                    open_apps.push(super::OpenAppInfo {
                        app_name: exe_name,
                        window_title: title,
                        version: version_str,
                    });
                }

                if open_apps.len() >= 25 {
                    break;
                }

                curr = GetWindow(curr, GW_HWNDNEXT);
            }

            if !target_hwnd.is_null() {
                let mut title_buf = [0u16; 512];
                let len = GetWindowTextW(target_hwnd, title_buf.as_mut_ptr(), 512);
                let title = if len > 0 {
                    OsString::from_wide(&title_buf[..len as usize])
                        .to_string_lossy()
                        .to_string()
                } else {
                    "(Active Window)".to_string()
                };

                let mut pid = 0u32;
                GetWindowThreadProcessId(target_hwnd, &mut pid);
                let (exe_name, version_str, _) = inspect_process(pid);

                if !open_apps.iter().any(|a| a.app_name == exe_name) {
                    open_apps.insert(
                        0,
                        super::OpenAppInfo {
                            app_name: exe_name.clone(),
                            window_title: title.clone(),
                            version: version_str.clone(),
                        },
                    );
                }

                (title, exe_name, version_str, open_apps)
            } else {
                (
                    "(Active Desktop)".to_string(),
                    "Desktop Application".to_string(),
                    "".to_string(),
                    open_apps,
                )
            }
        }
    }

    fn friendly_app_name(raw_exe: &str) -> String {
        let lower = raw_exe.to_lowercase();
        match lower.as_str() {
            "chrome.exe" => "Google Chrome".to_string(),
            "msedge.exe" => "Microsoft Edge".to_string(),
            "firefox.exe" => "Mozilla Firefox".to_string(),
            "brave.exe" => "Brave Browser".to_string(),
            "code.exe" => "Visual Studio Code".to_string(),
            "slack.exe" => "Slack".to_string(),
            "discord.exe" => "Discord".to_string(),
            "postman.exe" => "Postman".to_string(),
            "figma.exe" => "Figma".to_string(),
            "notepad.exe" => "Notepad".to_string(),
            "screencraft.exe" => "ScreenCraft".to_string(),
            _ => raw_exe.trim_end_matches(".exe").to_string(),
        }
    }

    pub fn get_gpu_info() -> (String, String) {
        #[link(name = "advapi32")]
        extern "system" {
            fn RegOpenKeyExW(
                h_key: isize,
                lp_sub_key: *const u16,
                ul_options: u32,
                sam_desired: u32,
                phk_result: *mut isize,
            ) -> i32;
            fn RegEnumKeyExW(
                h_key: isize,
                dw_index: u32,
                lp_name: *mut u16,
                lpc_ch_name: *mut u32,
                lp_reserved: *mut u32,
                lp_class: *mut u16,
                lpc_ch_class: *mut u32,
                lpft_last_write_time: *mut u64,
            ) -> i32;
            fn RegQueryValueExW(
                h_key: isize,
                lp_value_name: *const u16,
                lp_reserved: *mut u32,
                lp_type: *mut u32,
                lp_data: *mut u8,
                lpcb_data: *mut u32,
            ) -> i32;
            fn RegCloseKey(h_key: isize) -> i32;
        }

        const HKEY_LOCAL_MACHINE: isize = -2147483646; // 0x80000002
        const KEY_READ: u32 = 0x20019;

        let sub_key: Vec<u16> = "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\0"
            .encode_utf16()
            .collect();

        unsafe {
            let mut h_root = 0isize;
            if RegOpenKeyExW(HKEY_LOCAL_MACHINE, sub_key.as_ptr(), 0, KEY_READ, &mut h_root) != 0 {
                return ("Generic Display Adapter".to_string(), "".to_string());
            }

            let mut best_gpu = String::new();
            let mut best_driver = String::new();

            for index in 0..16 {
                let mut name_buf = [0u16; 64];
                let mut name_len = 64u32;
                if RegEnumKeyExW(
                    h_root,
                    index,
                    name_buf.as_mut_ptr(),
                    &mut name_len,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                ) != 0
                {
                    break;
                }

                let sub_folder = OsString::from_wide(&name_buf[..name_len as usize]).to_string_lossy().to_string();
                if !sub_folder.starts_with("00") {
                    continue;
                }

                let full_sub: Vec<u16> = format!("{}\\{}\0", "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}", sub_folder)
                    .encode_utf16()
                    .collect();

                let mut h_adapter = 0isize;
                if RegOpenKeyExW(HKEY_LOCAL_MACHINE, full_sub.as_ptr(), 0, KEY_READ, &mut h_adapter) == 0 {
                    let desc_val: Vec<u16> = "DriverDesc\0".encode_utf16().collect();
                    let ver_val: Vec<u16> = "DriverVersion\0".encode_utf16().collect();

                    let mut buf = [0u8; 512];
                    let mut buf_size = 512u32;
                    let mut val_type = 0u32;

                    let mut gpu_name = String::new();
                    if RegQueryValueExW(h_adapter, desc_val.as_ptr(), std::ptr::null_mut(), &mut val_type, buf.as_mut_ptr(), &mut buf_size) == 0 && buf_size > 2 {
                        let u16_slice = std::slice::from_raw_parts(buf.as_ptr() as *const u16, (buf_size as usize) / 2);
                        gpu_name = OsString::from_wide(u16_slice).to_string_lossy().trim_matches('\0').to_string();
                    }

                    let mut driver_ver = String::new();
                    buf_size = 512;
                    if RegQueryValueExW(h_adapter, ver_val.as_ptr(), std::ptr::null_mut(), &mut val_type, buf.as_mut_ptr(), &mut buf_size) == 0 && buf_size > 2 {
                        let u16_slice = std::slice::from_raw_parts(buf.as_ptr() as *const u16, (buf_size as usize) / 2);
                        driver_ver = OsString::from_wide(u16_slice).to_string_lossy().trim_matches('\0').to_string();
                    }

                    RegCloseKey(h_adapter);

                    // Prefer dedicated NVIDIA/AMD/Intel Arc over basic software renderers
                    if !gpu_name.is_empty() && !gpu_name.contains("Basic") {
                        best_gpu = gpu_name;
                        best_driver = driver_ver;
                        if best_gpu.contains("NVIDIA") || best_gpu.contains("Radeon RX") || best_gpu.contains("GeForce") {
                            break;
                        }
                    }
                }
            }

            RegCloseKey(h_root);

            if best_gpu.is_empty() {
                best_gpu = "Integrated / Standard Display Adapter".to_string();
            }

            (best_gpu, best_driver)
        }
    }
}

pub fn extract_system_diagnostics(
    resolution: Option<&str>,
    scale_factor: Option<f64>,
) -> SystemDiagnostics {
    let mut sys = System::new_all();
    sys.refresh_all();

    // OS & Build
    let os_name = System::name().unwrap_or_else(|| "Windows".to_string());
    let os_ver = System::os_version().unwrap_or_else(|| "".to_string());
    let kernel_ver = System::kernel_version().unwrap_or_else(|| "".to_string());
    let arch = std::env::consts::ARCH;

    let os_display = format!("{} {} ({}-bit)", os_name, os_ver, if arch == "x86_64" { "64" } else { arch });
    let os_build = if !kernel_ver.is_empty() {
        format!("Build {}", kernel_ver)
    } else {
        "Build Standard".to_string()
    };

    // CPU & RAM
    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().trim().to_string())
        .unwrap_or_else(|| "Multi-core Processor".to_string());
    let cpu_cores = format!("{} Cores", sys.cpus().len());

    let total_ram_bytes = sys.total_memory();
    let avail_ram_bytes = sys.available_memory();
    let ram_total_gb = (total_ram_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
    let ram_avail_gb = (avail_ram_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
    let ram_used_pct = if total_ram_bytes > 0 {
        (((total_ram_bytes - avail_ram_bytes) as f64 / total_ram_bytes as f64) * 100.0) as u8
    } else {
        0
    };

    // Display & DPI scale
    let display_res = resolution.unwrap_or("1920x1080").to_string();
    let scale_pct = ((scale_factor.unwrap_or(1.0) * 100.0).round()) as u32;

    // GPU & Active Window
    #[cfg(target_os = "windows")]
    let (gpu_name, gpu_driver) = win_ops::get_gpu_info();
    #[cfg(not(target_os = "windows"))]
    let (gpu_name, gpu_driver) = ("Integrated Graphics".to_string(), "".to_string());

    #[cfg(target_os = "windows")]
    let (win_title, app_name, app_ver, available_apps) = win_ops::get_active_windows();
    #[cfg(not(target_os = "windows"))]
    let (win_title, app_name, app_ver, available_apps) = (
        "(Desktop)".to_string(),
        "Browser/App".to_string(),
        "".to_string(),
        Vec::<OpenAppInfo>::new(),
    );

    let now = get_local_timestamp();

    // Formatted single-line stamp for footer watermark:
    // e.g. "Windows 11 Build 26100 (64-bit) | AMD Ryzen 7 7840HS | RAM: 16.0 GB (Free: 6.4 GB) | 1920x1080 @ 125% | Target: Google Chrome v128.0 | 2026-10-01 13:56:33"
    let compact_stamp = format!(
        "{} {} | {} | RAM: {:.1}GB (Free: {:.1}GB) | {} @ {}% Scale | Target: {} {} | {}",
        os_display,
        os_build,
        cpu_brand,
        ram_total_gb,
        ram_avail_gb,
        display_res,
        scale_pct,
        app_name,
        if !app_ver.is_empty() { &app_ver } else { "" },
        now
    );

    // Markdown Table for QA tickets / Webhook
    let markdown_table = format!(
        "### 🏛️ Environment & Hardware Diagnostics\n\n\
        | Diagnostic Metric | Detected Hardware / Environment Specification |\n\
        | :--- | :--- |\n\
        | **OS & Architecture** | `{}` `{}` |\n\
        | **Processor (CPU)** | `{}` ({}) |\n\
        | **System Memory (RAM)** | `{:.1} GB Total` (Available: `{:.1} GB`, Usage: `{}`%) |\n\
        | **Graphics (GPU)** | `{}` {} |\n\
        | **Display & Scaling** | `{}` @ `{}% Scale (DPI)` |\n\
        | **Target Application** | `{}` {} |\n\
        | **Active Window Title** | `{}` |\n\
        | **Captured Timestamp** | `{}` (Local Time) |\n",
        os_display,
        os_build,
        cpu_brand,
        cpu_cores,
        ram_total_gb,
        ram_avail_gb,
        ram_used_pct,
        gpu_name,
        if !gpu_driver.is_empty() { format!("(Driver: `{}`)", gpu_driver) } else { "".to_string() },
        display_res,
        scale_pct,
        app_name,
        if !app_ver.is_empty() { format!("`{}`", app_ver) } else { "".to_string() },
        win_title,
        now
    );

    SystemDiagnostics {
        os_name: os_display,
        os_build,
        cpu_name: cpu_brand,
        cpu_cores,
        ram_total_gb: (ram_total_gb * 10.0).round() / 10.0,
        ram_available_gb: (ram_avail_gb * 10.0).round() / 10.0,
        ram_used_pct,
        gpu_name,
        gpu_driver_version: gpu_driver,
        display_resolution: display_res,
        display_scale_pct: scale_pct,
        active_window_title: win_title,
        active_window_app: app_name,
        active_window_version: app_ver,
        timestamp: now,
        compact_stamp,
        markdown_table,
        available_apps,
    }
}

#[cfg(target_os = "windows")]
fn get_local_timestamp() -> String {
    #[repr(C)]
    struct SYSTEMTIME {
        w_year: u16,
        w_month: u16,
        w_day_of_week: u16,
        w_day: u16,
        w_hour: u16,
        w_minute: u16,
        w_second: u16,
        w_milliseconds: u16,
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GetLocalTime(lp_system_time: *mut SYSTEMTIME);
    }

    unsafe {
        let mut st = std::mem::zeroed::<SYSTEMTIME>();
        GetLocalTime(&mut st);
        format!(
            "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
            st.w_year, st.w_month, st.w_day, st.w_hour, st.w_minute, st.w_second
        )
    }
}

#[cfg(not(target_os = "windows"))]
fn get_local_timestamp() -> String {
    "Local Time".to_string()
}

