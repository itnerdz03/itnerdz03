use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::Utc;
use uuid::Uuid;
use zip::ZipWriter;
use std::io::Write;
use std::fs::File;

use crate::database::Database;
use crate::models::{Backup, BackupType, BackupSchedule};

#[tauri::command]
pub async fn create_backup(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    name: String,
    include_plugins: bool,
    include_oxide_data: bool,
    include_player_data: bool,
    include_map: bool,
    backup_type: Option<String>,
) -> Result<Backup, String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let server_path = std::path::Path::new(&server.install_path)
        .join("server")
        .join(&server.identity);

    let backups_dir = std::path::Path::new(&server.install_path)
        .join("backups");
    std::fs::create_dir_all(&backups_dir)
        .map_err(|e| e.to_string())?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("{}_{}.zip", name.replace(" ", "_"), timestamp);
    let backup_path = backups_dir.join(&backup_filename);

    let file = File::create(&backup_path)
        .map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);

    let options = zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Backup map files
    if include_map {
        if let Ok(entries) = std::fs::read_dir(&server_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                if name.ends_with(".sav") || name.ends_with(".map") {
                    if let Ok(content) = std::fs::read(&path) {
                        let _ = zip.start_file(&name, options);
                        let _ = zip.write_all(&content);
                    }
                }
            }
        }
    }

    // Backup player data
    if include_player_data {
        let player_files = [
            "player.blueprints.5.db",
            "player.deaths.5.db",
            "player.states.5.db",
            "player.identities.5.db",
            "player.tokens.5.db",
        ];
        for file_name in player_files {
            let file_path = server_path.join(file_name);
            if file_path.exists() {
                if let Ok(content) = std::fs::read(&file_path) {
                    let _ = zip.start_file(file_name, options);
                    let _ = zip.write_all(&content);
                }
            }
        }
    }

    // Backup Oxide data
    if include_oxide_data {
        let oxide_data_path = std::path::Path::new(&server.install_path)
            .join("oxide")
            .join("data");

        if oxide_data_path.exists() {
            add_directory_to_zip(&mut zip, &oxide_data_path, "oxide/data", options)?;
        }

        let oxide_config_path = std::path::Path::new(&server.install_path)
            .join("oxide")
            .join("config");

        if oxide_config_path.exists() {
            add_directory_to_zip(&mut zip, &oxide_config_path, "oxide/config", options)?;
        }
    }

    // Backup plugins
    if include_plugins {
        let plugins_path = std::path::Path::new(&server.install_path)
            .join("oxide")
            .join("plugins");

        if plugins_path.exists() {
            add_directory_to_zip(&mut zip, &plugins_path, "oxide/plugins", options)?;
        }
    }

    zip.finish().map_err(|e| e.to_string())?;

    let size = std::fs::metadata(&backup_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let backup = Backup {
        id: Uuid::new_v4().to_string(),
        server_id: server_id.clone(),
        name,
        path: backup_path.to_string_lossy().to_string(),
        size_bytes: size,
        created_at: Utc::now(),
        backup_type: backup_type
            .map(|t| BackupType::from_string(&t))
            .unwrap_or(BackupType::Manual),
        include_plugins,
        include_oxide_data,
        include_player_data,
        include_map,
    };

    let db_guard = db.lock().await;
    db_guard.create_backup_record(&backup)?;

    Ok(backup)
}

fn add_directory_to_zip(
    zip: &mut ZipWriter<File>,
    dir_path: &std::path::Path,
    prefix: &str,
    options: zip::write::FileOptions,
) -> Result<(), String> {
    if !dir_path.exists() {
        return Ok(());
    }

    let entries = std::fs::read_dir(dir_path)
        .map_err(|e| e.to_string())?;

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = format!("{}/{}", prefix, path.file_name().unwrap().to_string_lossy());

        if path.is_dir() {
            add_directory_to_zip(zip, &path, &name, options)?;
        } else {
            if let Ok(content) = std::fs::read(&path) {
                let _ = zip.start_file(&name, options);
                let _ = zip.write_all(&content);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn restore_backup(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    backup_id: String,
) -> Result<(), String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;

    let backups = db_guard.get_backups(&server_id)?;
    let backup = backups.iter()
        .find(|b| b.id == backup_id)
        .ok_or("Backup not found")?;
    drop(db_guard);

    let backup_path = std::path::Path::new(&backup.path);
    if !backup_path.exists() {
        return Err("Backup file not found".to_string());
    }

    let file = File::open(&backup_path)
        .map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| e.to_string())?;

    let server_path = std::path::Path::new(&server.install_path);

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| e.to_string())?;

        let outpath = server_path.join(file.name());

        if file.is_dir() {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| e.to_string())?;
            }

            let mut outfile = File::create(&outpath)
                .map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_backups(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
) -> Result<Vec<Backup>, String> {
    let db_guard = db.lock().await;
    db_guard.get_backups(&server_id)
}

#[tauri::command]
pub async fn delete_backup(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    backup_id: String,
    delete_file: bool,
) -> Result<(), String> {
    let db_guard = db.lock().await;

    if delete_file {
        // Would need to get backup path from DB first
        // For now, just delete the record
    }

    db_guard.delete_backup_record(&backup_id)
}

#[tauri::command]
pub async fn schedule_backup(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    name: String,
    cron_expression: String,
    retain_count: u32,
    include_plugins: bool,
    include_oxide_data: bool,
    include_player_data: bool,
    include_map: bool,
) -> Result<BackupSchedule, String> {
    let schedule = BackupSchedule {
        id: Uuid::new_v4().to_string(),
        server_id,
        name,
        cron_expression,
        retain_count,
        include_plugins,
        include_oxide_data,
        include_player_data,
        include_map,
        is_active: true,
        last_run: None,
        next_run: None,
        created_at: Utc::now(),
    };

    // In a full implementation, you would store this in the database
    // and set up a background job to run the backups

    Ok(schedule)
}

#[tauri::command]
pub async fn get_scheduled_backups(
    _server_id: String,
) -> Result<Vec<BackupSchedule>, String> {
    // Would fetch from database
    Ok(Vec::new())
}

#[tauri::command]
pub async fn cancel_scheduled_backup(
    _schedule_id: String,
) -> Result<(), String> {
    // Would delete from database
    Ok(())
}
