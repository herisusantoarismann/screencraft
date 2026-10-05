use base64::Engine;
use std::io::Cursor;
use std::str::FromStr;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WebviewWindow,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

mod diagnostics;

#[tauri::command]
fn get_system_diagnostics(window: WebviewWindow) -> Result<diagnostics::SystemDiagnostics, String> {
    let mut res_str = None;
    let mut scale = None;

    if let Ok(Some(monitor)) = window.current_monitor() {
        let size = monitor.size();
        res_str = Some(format!("{}x{}", size.width, size.height));
        scale = Some(monitor.scale_factor());
    }

    Ok(diagnostics::extract_system_diagnostics(res_str.as_deref(), scale))
}

fn do_capture_screen() -> Result<String, String> {
    let monitors = xcap::Monitor::all().map_err(|e| format!("Failed to list monitors: {e}"))?;
    if monitors.is_empty() {
        return Err("No monitor found".to_string());
    }

    // Ambil monitor utama (primary) atau fallback ke monitor pertama
    let monitor = monitors
        .iter()
        .find(|m| m.is_primary())
        .unwrap_or(&monitors[0]);

    let image = monitor
        .capture_image()
        .map_err(|e| format!("Failed to capture image: {e}"))?;

    let mut buffer = Cursor::new(Vec::new());
    let encoder = image::codecs::png::PngEncoder::new_with_quality(
        &mut buffer,
        image::codecs::png::CompressionType::Fast,
        image::codecs::png::FilterType::NoFilter,
    );
    use image::ImageEncoder;
    encoder
        .write_image(
            image.as_raw(),
            image.width(),
            image.height(),
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| format!("Failed to encode image to PNG: {e}"))?;

    let base64_str = base64::engine::general_purpose::STANDARD.encode(buffer.into_inner());
    Ok(format!("data:image/png;base64,{}", base64_str))
}

#[cfg(target_os = "windows")]
fn exclude_from_capture(window: &WebviewWindow) {
    #[link(name = "user32")]
    extern "system" {
        fn SetWindowDisplayAffinity(hwnd: *mut std::ffi::c_void, affinity: u32) -> i32;
    }
    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            SetWindowDisplayAffinity(hwnd.0 as *mut std::ffi::c_void, 0x00000011);
        }
    }
}

#[tauri::command]
fn capture_fullscreen() -> Result<String, String> {
    do_capture_screen()
}

#[tauri::command]
fn prepare_for_recording(window: WebviewWindow) -> Result<(), String> {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let logical_size = monitor.size().to_logical::<f64>(scale);
        let _ = window.set_position(tauri::LogicalPosition::new(0.0, 0.0));
        let _ = window.set_size(tauri::LogicalSize::new(logical_size.width, logical_size.height));
    }
    let _ = window.set_always_on_top(false);
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn enter_recording_mode(window: WebviewWindow) -> Result<(), String> {
    // Hide window briefly during repositioning to prevent Windows DWM white frame flash
    let _ = window.hide();
    let _ = window.set_fullscreen(false);
    let _ = window.set_resizable(false);
    let _ = window.set_always_on_top(true);
    let width = 310.0;
    let height = 70.0;
    let _ = window.set_size(tauri::LogicalSize::new(width, height));

    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let logical_size = monitor.size().to_logical::<f64>(scale);
        let pos_x = (logical_size.width - width - 24.0).max(0.0);
        let pos_y = (logical_size.height - height - 48.0).max(0.0);
        let _ = window.set_position(tauri::LogicalPosition::new(pos_x, pos_y));
    }
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn exit_recording_mode(window: WebviewWindow) -> Result<(), String> {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let logical_size = monitor.size().to_logical::<f64>(scale);
        let _ = window.set_position(tauri::LogicalPosition::new(0.0, 0.0));
        let _ = window.set_size(tauri::LogicalSize::new(logical_size.width, logical_size.height));
    }
    let _ = window.set_fullscreen(true);
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn enter_floating_bar_mode(window: WebviewWindow) -> Result<(), String> {
    let _ = window.hide();
    let _ = window.set_fullscreen(false);
    let _ = window.set_resizable(false);
    let _ = window.set_always_on_top(true);
    let width = 620.0;
    let height = 74.0;
    let _ = window.set_size(tauri::LogicalSize::new(width, height));

    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let logical_size = monitor.size().to_logical::<f64>(scale);
        let pos_x = ((logical_size.width - width) / 2.0).max(0.0);
        let pos_y = 20.0;
        let _ = window.set_position(tauri::LogicalPosition::new(pos_x, pos_y));
    }
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn enter_fullscreen_mode(window: WebviewWindow) -> Result<(), String> {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let logical_size = monitor.size().to_logical::<f64>(scale);
        let _ = window.set_position(tauri::LogicalPosition::new(0.0, 0.0));
        let _ = window.set_size(tauri::LogicalSize::new(logical_size.width, logical_size.height));
    }
    let _ = window.set_fullscreen(true);
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn enter_ticket_floater_mode(window: WebviewWindow) -> Result<(), String> {
    let _ = window.hide();
    let _ = window.set_fullscreen(false);
    let _ = window.set_resizable(false);
    let _ = window.set_always_on_top(true);
    let width = 340.0;
    let height = 210.0;
    let _ = window.set_size(tauri::LogicalSize::new(width, height));

    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let logical_size = monitor.size().to_logical::<f64>(scale);
        let pos_x = (logical_size.width - width - 24.0).max(0.0);
        let pos_y = (logical_size.height - height - 48.0).max(0.0);
        let _ = window.set_position(tauri::LogicalPosition::new(pos_x, pos_y));
    }
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn exit_ticket_floater_mode(window: WebviewWindow) -> Result<(), String> {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let logical_size = monitor.size().to_logical::<f64>(scale);
        let _ = window.set_position(tauri::LogicalPosition::new(0.0, 0.0));
        let _ = window.set_size(tauri::LogicalSize::new(logical_size.width, logical_size.height));
    }
    let _ = window.set_fullscreen(true);
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn trigger_screenshot(window: WebviewWindow) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    exclude_from_capture(&window);

    do_capture_screen()
}

#[derive(serde::Serialize)]
pub struct SaveResult {
    pub success: bool,
    pub saved_path: Option<String>,
    pub saved_dir: Option<String>,
    pub file_name: Option<String>,
}

#[tauri::command]
fn save_file_with_dialog(
    window: WebviewWindow,
    default_name: String,
    base64_data: String,
    last_dir: Option<String>,
    filter_name: String,
    filter_extension: String,
) -> Result<SaveResult, String> {
    let clean_base64 = if let Some(pos) = base64_data.find(',') {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_base64)
        .map_err(|e| format!("Failed to decode base64 data: {e}"))?;

    let mut dialog = rfd::FileDialog::new()
        .set_file_name(&default_name);

    if !filter_extension.is_empty() && filter_extension != "*" {
        dialog = dialog.add_filter(&filter_name, &[&filter_extension]);
    }

    if let Some(ref dir) = last_dir {
        let p = std::path::Path::new(dir);
        if p.exists() && p.is_dir() {
            dialog = dialog.set_directory(p);
        } else if let Ok(download_dir) = window.path().download_dir() {
            dialog = dialog.set_directory(&download_dir);
        }
    } else if let Ok(download_dir) = window.path().download_dir() {
        dialog = dialog.set_directory(&download_dir);
    }

    // Temporarily disable always on top so native Windows dialog appears cleanly in front
    let _ = window.set_always_on_top(false);
    let picked = dialog.save_file();
    let _ = window.set_always_on_top(true);

    if let Some(path) = picked {
        std::fs::write(&path, bytes)
            .map_err(|e| format!("Failed to write file to {}: {e}", path.display()))?;

        let saved_dir = path.parent().map(|p| p.to_string_lossy().to_string());
        let file_name = path.file_name().map(|f| f.to_string_lossy().to_string());

        Ok(SaveResult {
            success: true,
            saved_path: Some(path.to_string_lossy().to_string()),
            saved_dir,
            file_name,
        })
    } else {
        Ok(SaveResult {
            success: false,
            saved_path: None,
            saved_dir: None,
            file_name: None,
        })
    }
}

#[tauri::command]
fn save_file_to_downloads(window: WebviewWindow, file_name: String, base64_data: String) -> Result<String, String> {
    let clean_base64 = if let Some(pos) = base64_data.find(',') {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_base64)
        .map_err(|e| format!("Failed to decode base64 data: {e}"))?;

    let download_dir = window
        .path()
        .download_dir()
        .map_err(|e| format!("Could not get Downloads directory: {e}"))?;

    let target_path = download_dir.join(&file_name);
    std::fs::write(&target_path, bytes)
        .map_err(|e| format!("Failed to write file to {}: {e}", target_path.display()))?;

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
fn close_overlay(window: WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
fn copy_to_clipboard(base64_png: String) -> Result<(), String> {
    let base64_clean = if let Some(stripped) = base64_png.strip_prefix("data:image/png;base64,") {
        stripped
    } else if let Some(stripped) = base64_png.strip_prefix("data:image/jpeg;base64,") {
        stripped
    } else if let Some(pos) = base64_png.find(',') {
        &base64_png[pos + 1..]
    } else {
        &base64_png
    };

    let png_bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_clean)
        .map_err(|e| format!("Failed to decode base64 data: {e}"))?;

    let img = image::load_from_memory(&png_bytes)
        .map_err(|e| format!("Failed to parse image data: {e}"))?;
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    let image_data = arboard::ImageData {
        width: width as usize,
        height: height as usize,
        bytes: std::borrow::Cow::from(rgba.into_raw()),
    };

    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| format!("Failed to initialize clipboard: {e}"))?;
    clipboard
        .set_image(image_data)
        .map_err(|e| format!("Failed to set image to clipboard: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn send_slack_webhook(webhook_url: String, message_text: String) -> Result<(), String> {
    let text_payload = if message_text.trim().is_empty() {
        "📸 Tangkapan layar dari *ScreenCraft*".to_string()
    } else {
        message_text.trim().to_string()
    };

    let json_body = serde_json::json!({
        "text": text_payload,
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": text_payload
                }
            }
        ]
    });

    let client = reqwest::Client::new();
    let res = client
        .post(webhook_url.trim())
        .json(&json_body)
        .send()
        .await
        .map_err(|e| format!("Network error sending to Slack: {e}"))?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Slack webhook returned error status ({}): {}", status, err_body));
    }

    Ok(())
}

#[tauri::command]
async fn send_discord_webhook(
    webhook_url: String,
    image_base64: String,
    content: String,
) -> Result<(), String> {
    let clean_base64 = if let Some(pos) = image_base64.find(',') {
        &image_base64[pos + 1..]
    } else {
        &image_base64
    };

    let png_bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_base64)
        .map_err(|e| format!("Failed to decode image base64: {e}"))?;

    let file_part = reqwest::multipart::Part::bytes(png_bytes)
        .file_name("screencraft-capture.png")
        .mime_str("image/png")
        .map_err(|e| format!("Failed to create multipart file part: {e}"))?;

    let text_payload = if content.trim().is_empty() {
        "📸 Tangkapan layar dari **ScreenCraft**".to_string()
    } else {
        content.trim().to_string()
    };

    let form = reqwest::multipart::Form::new()
        .text("content", text_payload)
        .part("file", file_part);

    let client = reqwest::Client::new();
    let res = client
        .post(webhook_url.trim())
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Network error sending to Discord: {e}"))?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Discord webhook returned error status ({}): {}", status, err_body));
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = enter_floating_bar_mode(window.clone());
                                let _ = app_handle.emit("open-floating-bar", ());
                                let _ = window.emit("open-floating-bar", ());
                            }
                        });
                    }
                })
                .build(),
        )
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                exclude_from_capture(&window);
            }
            let shortcut = Shortcut::from_str("CommandOrControl+Shift+S")
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            app.global_shortcut().register(shortcut)?;

            // System Tray Menu items
            let show_floating_item = MenuItem::with_id(app, "show_floating", "Show Floating", true, None::<&str>)?;
            let take_screenshot_item = MenuItem::with_id(app, "take_screenshot", "Take Screenshot (Ctrl+Shift+S)", true, None::<&str>)?;
            let record_screen_item = MenuItem::with_id(app, "record_screen", "Record Screen", true, None::<&str>)?;
            let separator1 = PredefinedMenuItem::separator(app)?;
            let settings_item = MenuItem::with_id(app, "settings", "Settings / Preferences", true, None::<&str>)?;
            let about_item = MenuItem::with_id(app, "about", "About ScreenCraft", true, None::<&str>)?;
            let separator2 = PredefinedMenuItem::separator(app)?;
            let exit_item = MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &show_floating_item,
                    &take_screenshot_item,
                    &record_screen_item,
                    &separator1,
                    &settings_item,
                    &about_item,
                    &separator2,
                    &exit_item,
                ],
            )?;

            let handle_take_screenshot = |app: &tauri::AppHandle| {
                if let Some(window) = app.get_webview_window("main") {
                    #[cfg(target_os = "windows")]
                    exclude_from_capture(&window);

                    let app_handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        match do_capture_screen() {
                            Ok(base64) => {
                                let _ = app_handle.emit("trigger-capture", Some(base64));
                            }
                            Err(e) => {
                                eprintln!("Failed to capture screen from tray: {e}");
                                let _ = app_handle.emit("trigger-capture", Option::<String>::None);
                            }
                        }
                    });
                }
            };

            let mut tray_builder = TrayIconBuilder::new()
                .tooltip("ScreenCraft")
                .title("ScreenCraft")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show_floating" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = enter_floating_bar_mode(window.clone());
                                let _ = app.emit("open-floating-bar", ());
                                let _ = app.emit("tray-show-floating", ());
                                let _ = window.emit("open-floating-bar", ());
                                let _ = window.emit("tray-show-floating", ());
                            }
                        }
                        "take_screenshot" => {
                            handle_take_screenshot(app);
                        }
                        "record_screen" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = app.emit("trigger-record", ());
                                let _ = window.emit("trigger-record", ());
                            }
                        }
                        "settings" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = app.emit("open-settings", ());
                                let _ = window.emit("open-settings", ());
                            }
                        }
                        "about" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = app.emit("open-about", ());
                                let _ = window.emit("open-about", ());
                            }
                        }
                        "exit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(move |tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        handle_take_screenshot(app);
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture_fullscreen,
            close_overlay,
            copy_to_clipboard,
            prepare_for_recording,
            enter_recording_mode,
            exit_recording_mode,
            enter_floating_bar_mode,
            enter_fullscreen_mode,
            enter_ticket_floater_mode,
            exit_ticket_floater_mode,
            trigger_screenshot,
            save_file_to_downloads,
            save_file_with_dialog,
            send_slack_webhook,
            send_discord_webhook,
            get_system_diagnostics
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
