use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub tier: UserTier,
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UserTier {
    Free,       // 1 server, basic features
    Basic,      // 3 servers, more features
    Pro,        // 10 servers, all features
    Enterprise, // Unlimited servers, priority support
    Admin,      // Full access to everything
}

impl UserTier {
    pub fn max_servers(&self) -> usize {
        match self {
            UserTier::Free => 1,
            UserTier::Basic => 3,
            UserTier::Pro => 10,
            UserTier::Enterprise => 100,
            UserTier::Admin => 1000,
        }
    }

    pub fn has_feature(&self, feature: &str) -> bool {
        match feature {
            "basic_rcon" => true,
            "player_management" => true,
            "console" => true,
            "plugin_manager" => !matches!(self, UserTier::Free),
            "wipe_scheduler" => !matches!(self, UserTier::Free),
            "backup_manager" => matches!(self, UserTier::Pro | UserTier::Enterprise | UserTier::Admin),
            "auto_updates" => matches!(self, UserTier::Pro | UserTier::Enterprise | UserTier::Admin),
            "custom_maps" => matches!(self, UserTier::Pro | UserTier::Enterprise | UserTier::Admin),
            "server_deployment" => matches!(self, UserTier::Enterprise | UserTier::Admin),
            "multi_admin" => matches!(self, UserTier::Enterprise | UserTier::Admin),
            "priority_support" => matches!(self, UserTier::Enterprise | UserTier::Admin),
            "admin_panel" => matches!(self, UserTier::Admin),
            _ => false,
        }
    }

    pub fn from_string(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "free" => UserTier::Free,
            "basic" => UserTier::Basic,
            "pro" => UserTier::Pro,
            "enterprise" => UserTier::Enterprise,
            "admin" => UserTier::Admin,
            _ => UserTier::Free,
        }
    }

    pub fn to_string(&self) -> String {
        match self {
            UserTier::Free => "free".to_string(),
            UserTier::Basic => "basic".to_string(),
            UserTier::Pro => "pro".to_string(),
            UserTier::Enterprise => "enterprise".to_string(),
            UserTier::Admin => "admin".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Server {
    pub id: String,
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
    pub server_image: Option<String>,
    pub header_image: Option<String>,
    pub server_url: Option<String>,
    pub map_name: String,
    pub custom_map_url: Option<String>,
    pub oxide_enabled: bool,
    pub modded: bool,
    pub created_at: DateTime<Utc>,
    pub owner_id: String,
    pub status: ServerStatus,
    pub last_wipe: Option<DateTime<Utc>>,
    pub auto_start: bool,
    pub startup_script: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ServerStatus {
    Offline,
    Starting,
    Online,
    Stopping,
    Restarting,
    Updating,
    Error(String),
}

impl ServerStatus {
    pub fn to_string(&self) -> String {
        match self {
            ServerStatus::Offline => "offline".to_string(),
            ServerStatus::Starting => "starting".to_string(),
            ServerStatus::Online => "online".to_string(),
            ServerStatus::Stopping => "stopping".to_string(),
            ServerStatus::Restarting => "restarting".to_string(),
            ServerStatus::Updating => "updating".to_string(),
            ServerStatus::Error(msg) => format!("error:{}", msg),
        }
    }

    pub fn from_string(s: &str) -> Self {
        if s.starts_with("error:") {
            return ServerStatus::Error(s[6..].to_string());
        }
        match s {
            "offline" => ServerStatus::Offline,
            "starting" => ServerStatus::Starting,
            "online" => ServerStatus::Online,
            "stopping" => ServerStatus::Stopping,
            "restarting" => ServerStatus::Restarting,
            "updating" => ServerStatus::Updating,
            _ => ServerStatus::Offline,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStats {
    pub server_id: String,
    pub players_online: u32,
    pub max_players: u32,
    pub fps: f32,
    pub ram_usage_mb: u64,
    pub cpu_usage_percent: f32,
    pub uptime_seconds: u64,
    pub entities: u32,
    pub network_in: u64,
    pub network_out: u64,
    pub queued_players: u32,
    pub joining_players: u32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub steam_id: String,
    pub name: String,
    pub ping: u32,
    pub address: String,
    pub connected_seconds: u64,
    pub health: f32,
    pub position: Option<Position>,
    pub is_muted: bool,
    pub is_admin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BannedPlayer {
    pub steam_id: String,
    pub name: String,
    pub reason: String,
    pub banned_at: DateTime<Utc>,
    pub banned_by: String,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plugin {
    pub name: String,
    pub filename: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub is_loaded: bool,
    pub resource_id: Option<u32>,
    pub latest_version: Option<String>,
    pub needs_update: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WipeSchedule {
    pub id: String,
    pub server_id: String,
    pub name: String,
    pub cron_expression: String,
    pub wipe_blueprints: bool,
    pub wipe_map: bool,
    pub wipe_player_data: bool,
    pub new_seed: bool,
    pub custom_seed: Option<u32>,
    pub pre_wipe_message: Option<String>,
    pub countdown_minutes: u32,
    pub is_active: bool,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Backup {
    pub id: String,
    pub server_id: String,
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub created_at: DateTime<Utc>,
    pub backup_type: BackupType,
    pub include_plugins: bool,
    pub include_oxide_data: bool,
    pub include_player_data: bool,
    pub include_map: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackupType {
    Manual,
    Scheduled,
    PreWipe,
    PreUpdate,
}

impl BackupType {
    pub fn to_string(&self) -> String {
        match self {
            BackupType::Manual => "manual".to_string(),
            BackupType::Scheduled => "scheduled".to_string(),
            BackupType::PreWipe => "pre_wipe".to_string(),
            BackupType::PreUpdate => "pre_update".to_string(),
        }
    }

    pub fn from_string(s: &str) -> Self {
        match s {
            "manual" => BackupType::Manual,
            "scheduled" => BackupType::Scheduled,
            "pre_wipe" => BackupType::PreWipe,
            "pre_update" => BackupType::PreUpdate,
            _ => BackupType::Manual,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSchedule {
    pub id: String,
    pub server_id: String,
    pub name: String,
    pub cron_expression: String,
    pub retain_count: u32,
    pub include_plugins: bool,
    pub include_oxide_data: bool,
    pub include_player_data: bool,
    pub include_map: bool,
    pub is_active: bool,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub category: String,
    pub message: String,
    pub server_id: Option<String>,
    pub user_id: Option<String>,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}

impl LogLevel {
    pub fn to_string(&self) -> String {
        match self {
            LogLevel::Debug => "debug".to_string(),
            LogLevel::Info => "info".to_string(),
            LogLevel::Warning => "warning".to_string(),
            LogLevel::Error => "error".to_string(),
            LogLevel::Critical => "critical".to_string(),
        }
    }

    pub fn from_string(s: &str) -> Self {
        match s {
            "debug" => LogLevel::Debug,
            "info" => LogLevel::Info,
            "warning" => LogLevel::Warning,
            "error" => LogLevel::Error,
            "critical" => LogLevel::Critical,
            _ => LogLevel::Info,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerPermission {
    pub id: String,
    pub user_id: String,
    pub server_id: String,
    pub can_view: bool,
    pub can_console: bool,
    pub can_players: bool,
    pub can_plugins: bool,
    pub can_config: bool,
    pub can_restart: bool,
    pub can_wipe: bool,
    pub can_backup: bool,
    pub assigned_by: String,
    pub assigned_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RustMap {
    pub name: String,
    pub path: Option<String>,
    pub is_custom: bool,
    pub size: Option<u64>,
    pub procedural_size: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsoleMessage {
    pub timestamp: DateTime<Utc>,
    pub message: String,
    pub message_type: ConsoleMessageType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConsoleMessageType {
    Info,
    Warning,
    Error,
    Chat,
    Command,
    Response,
}
