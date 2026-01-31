#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod database;
mod rcon;
mod server_manager;
mod models;
mod auth;
mod plugins;
mod backup;

use tauri::Manager;
use std::sync::Arc;
use tokio::sync::Mutex;

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();

            // Initialize database
            let db = database::Database::new(&app_handle).expect("Failed to initialize database");
            app.manage(Arc::new(Mutex::new(db)));

            // Initialize RCON manager
            let rcon_manager = rcon::RconManager::new();
            app.manage(Arc::new(Mutex::new(rcon_manager)));

            // Initialize server manager
            let server_manager = server_manager::ServerManager::new();
            app.manage(Arc::new(Mutex::new(server_manager)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            auth::login,
            auth::register,
            auth::logout,
            auth::reset_password,
            auth::get_current_user,
            auth::update_user,
            auth::get_all_users,
            auth::delete_user,
            auth::update_user_tier,
            auth::update_user_permissions,

            // Server commands
            server_manager::add_server,
            server_manager::remove_server,
            server_manager::get_servers,
            server_manager::get_server,
            server_manager::update_server,
            server_manager::start_server,
            server_manager::stop_server,
            server_manager::restart_server,
            server_manager::get_server_status,
            server_manager::install_rust_server,
            server_manager::update_rust_server,
            server_manager::verify_server_files,
            server_manager::generate_startup_script,
            server_manager::get_server_stats,

            // RCON commands
            rcon::connect_rcon,
            rcon::disconnect_rcon,
            rcon::send_command,
            rcon::get_rcon_status,

            // Player commands
            server_manager::get_players,
            server_manager::kick_player,
            server_manager::ban_player,
            server_manager::unban_player,
            server_manager::mute_player,
            server_manager::unmute_player,
            server_manager::teleport_player,
            server_manager::give_item,
            server_manager::send_message,

            // Plugin commands
            plugins::get_installed_plugins,
            plugins::install_plugin,
            plugins::uninstall_plugin,
            plugins::update_plugin,
            plugins::reload_plugin,
            plugins::unload_plugin,
            plugins::load_plugin,
            plugins::get_available_plugins,
            plugins::install_oxide,
            plugins::update_oxide,
            plugins::get_oxide_version,

            // Wipe commands
            server_manager::schedule_wipe,
            server_manager::cancel_wipe,
            server_manager::get_scheduled_wipes,
            server_manager::wipe_now,
            server_manager::get_wipe_options,

            // Backup commands
            backup::create_backup,
            backup::restore_backup,
            backup::get_backups,
            backup::delete_backup,
            backup::schedule_backup,
            backup::get_scheduled_backups,
            backup::cancel_scheduled_backup,

            // Map commands
            server_manager::get_maps,
            server_manager::set_map,
            server_manager::upload_custom_map,
            server_manager::delete_map,

            // Logging commands
            database::get_logs,
            database::add_log,
            database::clear_logs,

            // Permission commands
            auth::get_permissions,
            auth::assign_server_permission,
            auth::revoke_server_permission,
            auth::get_user_server_permissions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
