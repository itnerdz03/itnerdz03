use std::sync::Arc;
use std::collections::HashMap;
use std::process::Command;
use tokio::sync::Mutex;
use chrono::Utc;
use uuid::Uuid;
use serde::{Deserialize, Serialize};

use crate::database::Database;
use crate::rcon::RconManager;
use crate::models::*;

pub struct ServerManager {
    running_processes: HashMap<String, u32>, // server_id -> process_id
}

impl ServerManager {
    pub fn new() -> Self {
        ServerManager {
            running_processes: HashMap::new(),
        }
    }

    pub fn set_process(&mut self, server_id: &str, pid: u32) {
        self.running_processes.insert(server_id.to_string(), pid);
    }

    pub fn remove_process(&mut self, server_id: &str) {
        self.running_processes.remove(server_id);
    }

    pub fn get_process(&self, server_id: &str) -> Option<u32> {
        self.running_processes.get(server_id).copied()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewServerRequest {
    pub name: String,
    pub description: String,
    pub ip: String,
    pub port: u16,
    pub rcon_port: u16,
    pub rcon_password: String,
    pub query_port: u16,
    pub app_port: u16,
    pub install_path: String,
    pub identity: String,
    pub seed: u32,
    pub world_size: u32,
    pub max_players: u32,
    pub tickrate: u32,
    pub map_name: String,
    pub oxide_enabled: bool,
}

#[tauri::command]
pub async fn add_server(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    request: NewServerRequest,
    owner_id: String,
) -> Result<Server, String> {
    let db = db.lock().await;

    let server = Server {
        id: Uuid::new_v4().to_string(),
        name: request.name,
        description: request.description,
        ip: request.ip,
        port: request.port,
        rcon_port: request.rcon_port,
        rcon_password: request.rcon_password,
        query_port: request.query_port,
        app_port: request.app_port,
        install_path: request.install_path,
        identity: request.identity,
        seed: request.seed,
        world_size: request.world_size,
        max_players: request.max_players,
        tickrate: request.tickrate,
        server_image: None,
        header_image: None,
        server_url: None,
        map_name: request.map_name,
        custom_map_url: None,
        oxide_enabled: request.oxide_enabled,
        modded: request.oxide_enabled,
        created_at: Utc::now(),
        owner_id,
        status: ServerStatus::Offline,
        last_wipe: None,
        auto_start: false,
        startup_script: None,
    };

    db.create_server(&server)?;
    Ok(server)
}

#[tauri::command]
pub async fn remove_server(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
) -> Result<(), String> {
    let db = db.lock().await;
    db.delete_server(&server_id)
}

#[tauri::command]
pub async fn get_servers(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    owner_id: String,
) -> Result<Vec<Server>, String> {
    let db = db.lock().await;
    db.get_servers_by_owner(&owner_id)
}

#[tauri::command]
pub async fn get_server(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
) -> Result<Option<Server>, String> {
    let db = db.lock().await;
    db.get_server(&server_id)
}

#[tauri::command]
pub async fn update_server(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server: Server,
) -> Result<(), String> {
    let db = db.lock().await;
    db.update_server(&server)
}

#[tauri::command]
pub async fn start_server(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_manager: tauri::State<'_, Arc<Mutex<ServerManager>>>,
    server_id: String,
) -> Result<bool, String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    // Update status to starting
    let db_guard = db.lock().await;
    db_guard.update_server_status(&server_id, "starting")?;
    drop(db_guard);

    // Build the start command
    let startup_script = server.startup_script.clone()
        .unwrap_or_else(|| generate_default_startup_script(&server));

    // Execute the startup script
    let script_path = format!("{}/start_server.bat", server.install_path);
    std::fs::write(&script_path, &startup_script)
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        let child = Command::new("cmd")
            .args(["/C", &script_path])
            .current_dir(&server.install_path)
            .spawn()
            .map_err(|e| e.to_string())?;

        let pid = child.id();

        let mut manager = server_manager.lock().await;
        manager.set_process(&server_id, pid);
    }

    // Update status to online after a delay (in production, you'd verify the server is running)
    let db_guard = db.lock().await;
    db_guard.update_server_status(&server_id, "online")?;

    Ok(true)
}

#[tauri::command]
pub async fn stop_server(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_manager: tauri::State<'_, Arc<Mutex<ServerManager>>>,
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
) -> Result<bool, String> {
    // Update status
    let db_guard = db.lock().await;
    db_guard.update_server_status(&server_id, "stopping")?;
    drop(db_guard);

    // Try graceful shutdown via RCON first
    let rcon_guard = rcon_manager.lock().await;
    if let Some(conn) = rcon_guard.get_connection(&server_id) {
        if conn.connected {
            drop(rcon_guard);
            // Send quit command
            let _ = crate::rcon::send_command(
                rcon_manager.clone(),
                server_id.clone(),
                "quit".to_string(),
            ).await;
        }
    }

    // Force kill if needed
    let mut manager = server_manager.lock().await;
    if let Some(pid) = manager.get_process(&server_id) {
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .output();
        }
        manager.remove_process(&server_id);
    }

    // Update status
    let db_guard = db.lock().await;
    db_guard.update_server_status(&server_id, "offline")?;

    Ok(true)
}

#[tauri::command]
pub async fn restart_server(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_manager: tauri::State<'_, Arc<Mutex<ServerManager>>>,
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
) -> Result<bool, String> {
    // Stop server
    stop_server(
        db.clone(),
        server_manager.clone(),
        rcon_manager.clone(),
        server_id.clone(),
    ).await?;

    // Wait a moment
    tokio::time::sleep(std::time::Duration::from_secs(5)).await;

    // Start server
    start_server(db, server_manager, server_id).await
}

#[tauri::command]
pub async fn get_server_status(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
) -> Result<String, String> {
    let db = db.lock().await;
    let server = db.get_server(&server_id)?
        .ok_or("Server not found")?;
    Ok(server.status.to_string())
}

#[tauri::command]
pub async fn install_rust_server(
    server_id: String,
    install_path: String,
    beta_branch: Option<String>,
) -> Result<String, String> {
    // Create installation directory
    std::fs::create_dir_all(&install_path)
        .map_err(|e| e.to_string())?;

    // Generate SteamCMD installation script
    let branch = beta_branch.unwrap_or_else(|| "public".to_string());
    let script = format!(
        r#"@echo off
cd /d "{}"
if not exist steamcmd\steamcmd.exe (
    echo Downloading SteamCMD...
    powershell -Command "Invoke-WebRequest -Uri 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip' -OutFile 'steamcmd.zip'"
    powershell -Command "Expand-Archive -Path 'steamcmd.zip' -DestinationPath 'steamcmd' -Force"
    del steamcmd.zip
)

echo Installing/Updating Rust Dedicated Server...
steamcmd\steamcmd.exe +force_install_dir "{}" +login anonymous +app_update 258550 -beta {} validate +quit

echo Installation complete!
pause
"#,
        install_path, install_path, branch
    );

    let script_path = format!("{}/install_server.bat", install_path);
    std::fs::write(&script_path, &script)
        .map_err(|e| e.to_string())?;

    Ok(script_path)
}

#[tauri::command]
pub async fn update_rust_server(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    send_warning: bool,
    warning_message: Option<String>,
) -> Result<String, String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    // Generate update script
    let script = format!(
        r#"@echo off
cd /d "{}"
steamcmd\steamcmd.exe +force_install_dir "{}" +login anonymous +app_update 258550 validate +quit
echo Update complete!
"#,
        server.install_path, server.install_path
    );

    let script_path = format!("{}/update_server.bat", server.install_path);
    std::fs::write(&script_path, &script)
        .map_err(|e| e.to_string())?;

    Ok(script_path)
}

#[tauri::command]
pub async fn verify_server_files(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
) -> Result<String, String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let script = format!(
        r#"@echo off
cd /d "{}"
steamcmd\steamcmd.exe +force_install_dir "{}" +login anonymous +app_update 258550 validate +quit
echo Verification complete!
"#,
        server.install_path, server.install_path
    );

    let script_path = format!("{}/verify_server.bat", server.install_path);
    std::fs::write(&script_path, &script)
        .map_err(|e| e.to_string())?;

    Ok(script_path)
}

#[tauri::command]
pub async fn generate_startup_script(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    custom_args: Option<Vec<String>>,
) -> Result<String, String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let mut script = generate_default_startup_script(&server);

    if let Some(args) = custom_args {
        for arg in args {
            script = script.replace("^", &format!("{} ^\n", arg));
        }
    }

    // Save the script
    let script_path = format!("{}/start_server.bat", server.install_path);
    std::fs::write(&script_path, &script)
        .map_err(|e| e.to_string())?;

    // Update server with new startup script
    let db_guard = db.lock().await;
    let mut updated_server = server.clone();
    updated_server.startup_script = Some(script.clone());
    db_guard.update_server(&updated_server)?;

    Ok(script)
}

fn generate_default_startup_script(server: &Server) -> String {
    let map_arg = if server.custom_map_url.is_some() {
        format!("+server.levelurl \"{}\"", server.custom_map_url.as_ref().unwrap())
    } else {
        format!("+server.level \"{}\"", server.map_name)
    };

    format!(
        r#"@echo off
:start
cd /d "{}"
RustDedicated.exe ^
-batchmode ^
+server.port {} ^
+server.queryport {} ^
+rcon.port {} ^
+rcon.password "{}" ^
+rcon.web true ^
+server.identity "{}" ^
+server.seed {} ^
+server.worldsize {} ^
+server.maxplayers {} ^
+server.tickrate {} ^
+server.hostname "{}" ^
+server.description "{}" ^
{} ^
+app.port {} ^
-logfile "output.txt"

echo Server crashed or stopped. Restarting in 10 seconds...
timeout /t 10
goto start
"#,
        server.install_path,
        server.port,
        server.query_port,
        server.rcon_port,
        server.rcon_password,
        server.identity,
        server.seed,
        server.world_size,
        server.max_players,
        server.tickrate,
        server.name,
        server.description,
        map_arg,
        server.app_port
    )
}

#[tauri::command]
pub async fn get_server_stats(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
) -> Result<ServerStats, String> {
    // Try to get stats via RCON
    let response = crate::rcon::send_command(
        rcon_manager.clone(),
        server_id.clone(),
        "serverinfo".to_string(),
    ).await.unwrap_or_default();

    let info = crate::rcon::parse_server_info(&response);

    Ok(ServerStats {
        server_id: server_id.clone(),
        players_online: info.get("players").and_then(|s| s.parse().ok()).unwrap_or(0),
        max_players: info.get("maxplayers").and_then(|s| s.parse().ok()).unwrap_or(0),
        fps: info.get("framerate").and_then(|s| s.parse().ok()).unwrap_or(0.0),
        ram_usage_mb: info.get("memory").and_then(|s| s.parse().ok()).unwrap_or(0),
        cpu_usage_percent: 0.0, // Not available via RCON
        uptime_seconds: 0, // Would need to track this separately
        entities: info.get("entities").and_then(|s| s.parse().ok()).unwrap_or(0),
        network_in: info.get("netin").and_then(|s| s.parse().ok()).unwrap_or(0),
        network_out: info.get("netout").and_then(|s| s.parse().ok()).unwrap_or(0),
        queued_players: info.get("queued").and_then(|s| s.parse().ok()).unwrap_or(0),
        joining_players: info.get("joining").and_then(|s| s.parse().ok()).unwrap_or(0),
        timestamp: Utc::now(),
    })
}

// Player management commands
#[tauri::command]
pub async fn get_players(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
) -> Result<Vec<Player>, String> {
    let response = crate::rcon::send_command(
        rcon_manager.clone(),
        server_id,
        "players".to_string(),
    ).await?;

    let player_data = crate::rcon::parse_player_list(&response);

    let players: Vec<Player> = player_data.iter().map(|p| {
        Player {
            steam_id: p.get("steam_id").cloned().unwrap_or_default(),
            name: p.get("name").cloned().unwrap_or_default(),
            ping: p.get("ping").and_then(|s| s.parse().ok()).unwrap_or(0),
            address: p.get("address").cloned().unwrap_or_default(),
            connected_seconds: p.get("connected").and_then(|s| s.parse().ok()).unwrap_or(0),
            health: 100.0,
            position: None,
            is_muted: false,
            is_admin: false,
        }
    }).collect();

    Ok(players)
}

#[tauri::command]
pub async fn kick_player(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    steam_id: String,
    reason: Option<String>,
) -> Result<String, String> {
    let cmd = match reason {
        Some(r) => format!("kick {} \"{}\"", steam_id, r),
        None => format!("kick {}", steam_id),
    };
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn ban_player(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    steam_id: String,
    reason: Option<String>,
    duration: Option<u32>,
) -> Result<String, String> {
    let cmd = match (reason, duration) {
        (Some(r), Some(d)) => format!("ban {} {} \"{}\"", steam_id, d, r),
        (Some(r), None) => format!("ban {} \"{}\"", steam_id, r),
        (None, Some(d)) => format!("ban {} {}", steam_id, d),
        (None, None) => format!("ban {}", steam_id),
    };
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn unban_player(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    steam_id: String,
) -> Result<String, String> {
    let cmd = format!("unban {}", steam_id);
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn mute_player(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    steam_id: String,
) -> Result<String, String> {
    let cmd = format!("mute {}", steam_id);
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn unmute_player(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    steam_id: String,
) -> Result<String, String> {
    let cmd = format!("unmute {}", steam_id);
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn teleport_player(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    steam_id: String,
    x: f32,
    y: f32,
    z: f32,
) -> Result<String, String> {
    let cmd = format!("teleportpos {} {} {} {}", steam_id, x, y, z);
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn give_item(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    steam_id: String,
    item_name: String,
    amount: u32,
) -> Result<String, String> {
    let cmd = format!("inventory.giveto {} {} {}", steam_id, item_name, amount);
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

#[tauri::command]
pub async fn send_message(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    message: String,
    steam_id: Option<String>,
) -> Result<String, String> {
    let cmd = match steam_id {
        Some(id) => format!("say.user {} \"{}\"", id, message),
        None => format!("say \"{}\"", message),
    };
    crate::rcon::send_command(rcon_manager, server_id, cmd).await
}

// Wipe commands
#[tauri::command]
pub async fn schedule_wipe(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    name: String,
    cron_expression: String,
    wipe_blueprints: bool,
    wipe_map: bool,
    wipe_player_data: bool,
    new_seed: bool,
    custom_seed: Option<u32>,
    pre_wipe_message: Option<String>,
    countdown_minutes: u32,
) -> Result<WipeSchedule, String> {
    let schedule = WipeSchedule {
        id: Uuid::new_v4().to_string(),
        server_id,
        name,
        cron_expression,
        wipe_blueprints,
        wipe_map,
        wipe_player_data,
        new_seed,
        custom_seed,
        pre_wipe_message,
        countdown_minutes,
        is_active: true,
        last_run: None,
        next_run: None,
        created_at: Utc::now(),
    };

    let db = db.lock().await;
    db.create_wipe_schedule(&schedule)?;

    Ok(schedule)
}

#[tauri::command]
pub async fn cancel_wipe(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    schedule_id: String,
) -> Result<(), String> {
    let db = db.lock().await;
    db.delete_wipe_schedule(&schedule_id)
}

#[tauri::command]
pub async fn get_scheduled_wipes(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
) -> Result<Vec<WipeSchedule>, String> {
    let db = db.lock().await;
    db.get_wipe_schedules(&server_id)
}

#[tauri::command]
pub async fn wipe_now(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    wipe_blueprints: bool,
    wipe_map: bool,
    wipe_player_data: bool,
    new_seed: bool,
    custom_seed: Option<u32>,
) -> Result<(), String> {
    let db_guard = db.lock().await;
    let mut server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let server_path = std::path::Path::new(&server.install_path)
        .join("server")
        .join(&server.identity);

    // Delete map data
    if wipe_map {
        let map_files: Vec<_> = std::fs::read_dir(&server_path)
            .map_err(|e| e.to_string())?
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                name.ends_with(".map") || name.ends_with(".sav")
            })
            .collect();

        for file in map_files {
            let _ = std::fs::remove_file(file.path());
        }
    }

    // Delete player data
    if wipe_player_data {
        let player_path = server_path.join("player.blueprints.5.db");
        let _ = std::fs::remove_file(&player_path);

        let player_deaths = server_path.join("player.deaths.5.db");
        let _ = std::fs::remove_file(&player_deaths);

        let player_states = server_path.join("player.states.5.db");
        let _ = std::fs::remove_file(&player_states);
    }

    // Delete blueprints
    if wipe_blueprints {
        let bp_path = server_path.join("player.blueprints.5.db");
        let _ = std::fs::remove_file(&bp_path);
    }

    // Update seed if needed
    if new_seed {
        let new_seed_value = custom_seed.unwrap_or_else(|| {
            use std::time::{SystemTime, UNIX_EPOCH};
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as u32
        });
        server.seed = new_seed_value;
    }

    server.last_wipe = Some(Utc::now());

    let db_guard = db.lock().await;
    db_guard.update_server(&server)?;

    Ok(())
}

#[tauri::command]
pub async fn get_wipe_options() -> Result<Vec<String>, String> {
    Ok(vec![
        "Map Only".to_string(),
        "Map + Player Data".to_string(),
        "Map + Blueprints".to_string(),
        "Full Wipe (Map + Player Data + Blueprints)".to_string(),
    ])
}

// Map commands
#[tauri::command]
pub async fn get_maps(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
) -> Result<Vec<RustMap>, String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let mut maps = vec![
        RustMap {
            name: "Procedural Map".to_string(),
            path: None,
            is_custom: false,
            size: None,
            procedural_size: Some(server.world_size),
        },
        RustMap {
            name: "Barren".to_string(),
            path: None,
            is_custom: false,
            size: None,
            procedural_size: Some(server.world_size),
        },
        RustMap {
            name: "HapisIsland".to_string(),
            path: None,
            is_custom: false,
            size: None,
            procedural_size: None,
        },
        RustMap {
            name: "SavasIsland".to_string(),
            path: None,
            is_custom: false,
            size: None,
            procedural_size: None,
        },
        RustMap {
            name: "SavasIsland_koth".to_string(),
            path: None,
            is_custom: false,
            size: None,
            procedural_size: None,
        },
    ];

    // Check for custom maps
    let maps_path = std::path::Path::new(&server.install_path)
        .join("server")
        .join(&server.identity)
        .join("maps");

    if maps_path.exists() {
        if let Ok(entries) = std::fs::read_dir(&maps_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".map") {
                    let metadata = entry.metadata().ok();
                    maps.push(RustMap {
                        name: name.trim_end_matches(".map").to_string(),
                        path: Some(entry.path().to_string_lossy().to_string()),
                        is_custom: true,
                        size: metadata.map(|m| m.len()),
                        procedural_size: None,
                    });
                }
            }
        }
    }

    Ok(maps)
}

#[tauri::command]
pub async fn set_map(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    map_name: String,
    custom_url: Option<String>,
) -> Result<(), String> {
    let db_guard = db.lock().await;
    let mut server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;

    server.map_name = map_name;
    server.custom_map_url = custom_url;

    db_guard.update_server(&server)?;

    Ok(())
}

#[tauri::command]
pub async fn upload_custom_map(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    map_path: String,
    map_name: String,
) -> Result<(), String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let maps_dir = std::path::Path::new(&server.install_path)
        .join("server")
        .join(&server.identity)
        .join("maps");

    std::fs::create_dir_all(&maps_dir)
        .map_err(|e| e.to_string())?;

    let dest_path = maps_dir.join(format!("{}.map", map_name));
    std::fs::copy(&map_path, &dest_path)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_map(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: String,
    map_name: String,
) -> Result<(), String> {
    let db_guard = db.lock().await;
    let server = db_guard.get_server(&server_id)?
        .ok_or("Server not found")?;
    drop(db_guard);

    let map_path = std::path::Path::new(&server.install_path)
        .join("server")
        .join(&server.identity)
        .join("maps")
        .join(format!("{}.map", map_name));

    if map_path.exists() {
        std::fs::remove_file(&map_path)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
