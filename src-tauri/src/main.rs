#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod detector;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize the scan state
            app.manage(commands::ScanState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_folder,
            commands::get_scan_progress,
            commands::save_selected_bucks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
