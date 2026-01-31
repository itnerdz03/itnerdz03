use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

use crate::database::Database;
use crate::rcon::RconManager;
use crate::models::Plugin;

#[derive(Debug, Serialize, Deserialize)]
pub struct OxidePlugin {
    pub name: String,
    pub author: String,
    pub version: String,
    pub description: String,
    pub resource_id: Option<u32>,
    pub download_url: Option<String>,
}

#[tauri::command]
pub async fn get_installed_plugins(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
) -> Result<Vec<Plugin>, String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let plugins_path = std::path::Path::new(&server.install_path)
        .join("oxide")
        .join("plugins");

    let mut plugins = Vec::new();

    if plugins_path.exists() {
        let entries = std::fs::read_dir(&plugins_path)
            .map_err(|e| e.to_string())?;

        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "cs") {
                let filename = path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                let name = filename.trim_end_matches(".cs").to_string();

                // Try to read plugin metadata from file
                let content = std::fs::read_to_string(&path).unwrap_or_default();
                let (author, version, description) = parse_plugin_metadata(&content);

                // Check if plugin is loaded via RCON
                let is_loaded = check_plugin_loaded(&rcon_manager, &server_id, &name).await;

                plugins.push(Plugin {
                    name: name.clone(),
                    filename,
                    version,
                    author,
                    description,
                    is_loaded,
                    resource_id: None,
                    latest_version: None,
                    needs_update: false,
                });
            }
        }
    }

    Ok(plugins)
}

fn parse_plugin_metadata(content: &str) -> (String, String, String) {
    let mut author = String::from("Unknown");
    let mut version = String::from("1.0.0");
    let mut description = String::new();

    for line in content.lines() {
        let line = line.trim();

        if line.contains("Author =") || line.contains("Author=") {
            if let Some(val) = extract_string_value(line) {
                author = val;
            }
        } else if line.contains("Version =") || line.contains("Version=") {
            if let Some(val) = extract_version_value(line) {
                version = val;
            }
        } else if line.contains("Description =") || line.contains("Description=") {
            if let Some(val) = extract_string_value(line) {
                description = val;
            }
        }
    }

    (author, version, description)
}

fn extract_string_value(line: &str) -> Option<String> {
    let parts: Vec<&str> = line.split('=').collect();
    if parts.len() >= 2 {
        let value = parts[1..].join("=");
        let value = value.trim()
            .trim_matches('"')
            .trim_matches(',')
            .trim_matches(';')
            .to_string();
        Some(value)
    } else {
        None
    }
}

fn extract_version_value(line: &str) -> Option<String> {
    // Handle both string versions and VersionNumber
    if line.contains("new VersionNumber") {
        // Extract version from: new VersionNumber(1, 2, 3)
        if let Some(start) = line.find('(') {
            if let Some(end) = line.find(')') {
                let nums: Vec<&str> = line[start+1..end].split(',').collect();
                if nums.len() >= 3 {
                    return Some(format!("{}.{}.{}",
                        nums[0].trim(),
                        nums[1].trim(),
                        nums[2].trim()
                    ));
                }
            }
        }
    } else {
        return extract_string_value(line);
    }
    None
}

async fn check_plugin_loaded(
    rcon_manager: &tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: &str,
    plugin_name: &str,
) -> bool {
    if let Ok(response) = crate::rcon::send_command(
        rcon_manager.clone(),
        server_id.to_string(),
        "plugins".to_string(),
    ).await {
        response.to_lowercase().contains(&plugin_name.to_lowercase())
    } else {
        false
    }
}

#[tauri::command]
pub async fn install_plugin(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    plugin_path: String,
) -> Result<(), String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let plugins_dir = std::path::Path::new(&server.install_path)
        .join("oxide")
        .join("plugins");

    std::fs::create_dir_all(&plugins_dir)
        .map_err(|e| e.to_string())?;

    let source_path = std::path::Path::new(&plugin_path);
    let filename = source_path.file_name()
        .ok_or("Invalid plugin path")?;

    let dest_path = plugins_dir.join(filename);
    std::fs::copy(&source_path, &dest_path)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn uninstall_plugin(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    plugin_name: String,
) -> Result<(), String> {
    // Unload plugin first
    let _ = unload_plugin(rcon_manager, server_id.clone(), plugin_name.clone()).await;

    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let plugin_path = std::path::Path::new(&server.install_path)
        .join("oxide")
        .join("plugins")
        .join(format!("{}.cs", plugin_name));

    if plugin_path.exists() {
        std::fs::remove_file(&plugin_path)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_plugin(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    plugin_name: String,
    new_plugin_path: String,
) -> Result<(), String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let plugin_path = std::path::Path::new(&server.install_path)
        .join("oxide")
        .join("plugins")
        .join(format!("{}.cs", plugin_name));

    std::fs::copy(&new_plugin_path, &plugin_path)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn reload_plugin(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    plugin_name: String,
) -> Result<String, String> {
    let cmd = format!("oxide.reload {}", plugin_name);
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn unload_plugin(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    plugin_name: String,
) -> Result<String, String> {
    let cmd = format!("oxide.unload {}", plugin_name);
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn load_plugin(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    plugin_name: String,
) -> Result<String, String> {
    let cmd = format!("oxide.load {}", plugin_name);
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn get_available_plugins() -> Result<Vec<OxidePlugin>, String> {
    // This would typically fetch from uMod/Oxide API
    // For now, return some popular plugins as examples
    Ok(vec![
        OxidePlugin {
            name: "Kits".to_string(),
            author: "Reneb".to_string(),
            version: "3.2.6".to_string(),
            description: "Create kits with items and permissions".to_string(),
            resource_id: Some(668),
            download_url: None,
        },
        OxidePlugin {
            name: "Economics".to_string(),
            author: "Wulf".to_string(),
            version: "3.9.0".to_string(),
            description: "Basic economics system".to_string(),
            resource_id: Some(717),
            download_url: None,
        },
        OxidePlugin {
            name: "ServerRewards".to_string(),
            author: "k1lly0u".to_string(),
            version: "0.8.6".to_string(),
            description: "Reward points system".to_string(),
            resource_id: Some(1751),
            download_url: None,
        },
        OxidePlugin {
            name: "ZoneManager".to_string(),
            author: "k1lly0u".to_string(),
            version: "3.0.4".to_string(),
            description: "Create and manage zones on the map".to_string(),
            resource_id: Some(727),
            download_url: None,
        },
        OxidePlugin {
            name: "ImageLibrary".to_string(),
            author: "Absolut/k1lly0u".to_string(),
            version: "2.0.65".to_string(),
            description: "Library for storing/loading images".to_string(),
            resource_id: Some(1485),
            download_url: None,
        },
    ])
}

#[tauri::command]
pub async fn install_oxide(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    version: Option<String>,
) -> Result<String, String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    // Generate Oxide installation script
    let oxide_url = match version.as_deref() {
        Some("staging") => "https://umod.org/games/rust/download/develop",
        _ => "https://umod.org/games/rust/download",
    };

    let script = format!(
        r#"@echo off
cd /d "{}"
echo Downloading Oxide...
powershell -Command "Invoke-WebRequest -Uri '{}' -OutFile 'Oxide.Rust.zip'"
echo Extracting Oxide...
powershell -Command "Expand-Archive -Path 'Oxide.Rust.zip' -DestinationPath '.' -Force"
del Oxide.Rust.zip
echo Oxide installation complete!
pause
"#,
        server.install_path, oxide_url
    );

    let script_path = format!("{}/install_oxide.bat", server.install_path);
    std::fs::write(&script_path, &script)
        .map_err(|e| e.to_string())?;

    Ok(script_path)
}

#[tauri::command]
pub async fn update_oxide(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
) -> Result<String, String> {
    // Same as install, just overwrites files
    install_oxide(db, server_id, None).await
}

#[tauri::command]
pub async fn get_oxide_version(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
) -> Result<String, String> {
    // Try to get version via RCON
    if let Ok(response) = crate::rcon::send_command(
        rcon_manager.clone(),
        server_id.clone(),
        "oxide.version".to_string(),
    ).await {
        return Ok(response);
    }

    // Otherwise try to read from oxide manifest
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let manifest_path = std::path::Path::new(&server.install_path)
        .join("RustDedicated_Data")
        .join("Managed")
        .join("Oxide.Core.dll");

    if manifest_path.exists() {
        Ok("Oxide installed (version unknown)".to_string())
    } else {
        Ok("Oxide not installed".to_string())
    }
}
