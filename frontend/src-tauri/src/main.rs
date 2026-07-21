#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Serialize, Deserialize, Clone, Default)]
struct BgConfig {
    path: Option<String>,
    blur: u8,
    opacity: u8,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct IconConfig {
    user_icon_path: Option<String>,
    user_icon_pos_x: i32,
    user_icon_pos_y: i32,
    ai_icon_path: Option<String>,
    ai_icon_pos_x: i32,
    ai_icon_pos_y: i32,
}

// Función auxiliar para obtener el directorio raíz de datos de la app
fn get_app_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    tauri::api::path::app_local_data_dir(&app_handle.config())
        .ok_or_else(|| "No se pudo obtener el directorio de datos de la app".into())
}

#[tauri::command]
fn save_bg_config(app_handle: AppHandle, config: BgConfig) -> Result<(), String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    fs::create_dir_all(&config_path).map_err(|e| e.to_string())?;

    config_path.push("background_settings.json");
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, config_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_bg_config(app_handle: AppHandle) -> Result<BgConfig, String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    config_path.push("background_settings.json");

    if config_path.exists() {
        let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
        let config: BgConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(config)
    } else {
        Ok(BgConfig {
            path: None,
            blur: 0,
            opacity: 100,
        })
    }
}

#[tauri::command]
fn save_background_image(
    app_handle: AppHandle,
    image_bytes: Vec<u8>,
    extension: String,
) -> Result<String, String> {
    if image_bytes.len() > 50 * 1024 * 1024 {
        return Err("La imagen excede el límite de 50MB".into());
    }

    let mut bg_dir = get_app_data_dir(&app_handle)?;
    bg_dir.push("assets");
    bg_dir.push("backgrounds");

    fs::create_dir_all(&bg_dir).map_err(|e| e.to_string())?;

    let filename = format!("current_bg.{}", extension);
    bg_dir.push(&filename);

    fs::write(&bg_dir, image_bytes).map_err(|e| e.to_string())?;
    Ok(bg_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_icon_config(app_handle: AppHandle, config: IconConfig) -> Result<(), String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    fs::create_dir_all(&config_path).map_err(|e| e.to_string())?;

    config_path.push("icon_settings.json");
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, config_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_icon_config(app_handle: AppHandle) -> Result<IconConfig, String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    config_path.push("icon_settings.json");

    if config_path.exists() {
        let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
        let config: IconConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(config)
    } else {
        Ok(IconConfig {
            user_icon_path: None,
            user_icon_pos_x: 50,
            user_icon_pos_y: 50,
            ai_icon_path: None,
            ai_icon_pos_x: 50,
            ai_icon_pos_y: 50,
        })
    }
}

#[tauri::command]
fn save_icon_image(
    app_handle: AppHandle,
    image_bytes: Vec<u8>,
    extension: String,
    icon_type: String, // "user" o "ai"
) -> Result<String, String> {
    // 5 MB check para iconos
    if image_bytes.len() > 5 * 1024 * 1024 {
        return Err("La imagen del ícono excede el límite de 5MB".into());
    }

    let mut icon_dir = get_app_data_dir(&app_handle)?;
    icon_dir.push("assets");
    icon_dir.push("icons");

    fs::create_dir_all(&icon_dir).map_err(|e| e.to_string())?;

    let filename = format!("{}_icon.{}", icon_type, extension);
    icon_dir.push(&filename);

    fs::write(&icon_dir, image_bytes).map_err(|e| e.to_string())?;
    Ok(icon_dir.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = tauri::api::path::app_local_data_dir(&app.config());
            if let Some(mut path) = data_dir {
                path.push("config");
                let _ = fs::create_dir_all(&path);

                path.pop();
                path.push("assets");
                path.push("backgrounds");
                let _ = fs::create_dir_all(&path);

                path.pop();
                path.push("icons");
                let _ = fs::create_dir_all(&path);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_bg_config,
            load_bg_config,
            save_background_image,
            save_icon_config,
            load_icon_config,
            save_icon_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
