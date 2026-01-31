use rusqlite::{Connection, params};
use tauri::AppHandle;
use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::models::*;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_dir = app_handle
            .path_resolver()
            .app_data_dir()
            .ok_or("Failed to get app data directory")?;

        std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

        let db_path = app_dir.join("rust_server_manager.db");
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        let db = Database { conn };
        db.init_tables()?;

        Ok(db)
    }

    fn init_tables(&self) -> Result<(), String> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                tier TEXT DEFAULT 'free',
                created_at TEXT NOT NULL,
                last_login TEXT,
                is_active INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS servers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                ip TEXT NOT NULL,
                port INTEGER NOT NULL,
                rcon_port INTEGER NOT NULL,
                rcon_password TEXT NOT NULL,
                query_port INTEGER NOT NULL,
                app_port INTEGER NOT NULL,
                install_path TEXT NOT NULL,
                identity TEXT NOT NULL,
                seed INTEGER NOT NULL,
                world_size INTEGER NOT NULL,
                max_players INTEGER NOT NULL,
                tickrate INTEGER DEFAULT 30,
                server_image TEXT,
                header_image TEXT,
                server_url TEXT,
                map_name TEXT DEFAULT 'Procedural Map',
                custom_map_url TEXT,
                oxide_enabled INTEGER DEFAULT 0,
                modded INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                status TEXT DEFAULT 'offline',
                last_wipe TEXT,
                auto_start INTEGER DEFAULT 0,
                startup_script TEXT,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS server_permissions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                server_id TEXT NOT NULL,
                can_view INTEGER DEFAULT 1,
                can_console INTEGER DEFAULT 0,
                can_players INTEGER DEFAULT 0,
                can_plugins INTEGER DEFAULT 0,
                can_config INTEGER DEFAULT 0,
                can_restart INTEGER DEFAULT 0,
                can_wipe INTEGER DEFAULT 0,
                can_backup INTEGER DEFAULT 0,
                assigned_by TEXT NOT NULL,
                assigned_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (server_id) REFERENCES servers(id),
                UNIQUE(user_id, server_id)
            );

            CREATE TABLE IF NOT EXISTS wipe_schedules (
                id TEXT PRIMARY KEY,
                server_id TEXT NOT NULL,
                name TEXT NOT NULL,
                cron_expression TEXT NOT NULL,
                wipe_blueprints INTEGER DEFAULT 0,
                wipe_map INTEGER DEFAULT 1,
                wipe_player_data INTEGER DEFAULT 0,
                new_seed INTEGER DEFAULT 1,
                custom_seed INTEGER,
                pre_wipe_message TEXT,
                countdown_minutes INTEGER DEFAULT 5,
                is_active INTEGER DEFAULT 1,
                last_run TEXT,
                next_run TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (server_id) REFERENCES servers(id)
            );

            CREATE TABLE IF NOT EXISTS backups (
                id TEXT PRIMARY KEY,
                server_id TEXT NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                backup_type TEXT NOT NULL,
                include_plugins INTEGER DEFAULT 1,
                include_oxide_data INTEGER DEFAULT 1,
                include_player_data INTEGER DEFAULT 1,
                include_map INTEGER DEFAULT 1,
                FOREIGN KEY (server_id) REFERENCES servers(id)
            );

            CREATE TABLE IF NOT EXISTS backup_schedules (
                id TEXT PRIMARY KEY,
                server_id TEXT NOT NULL,
                name TEXT NOT NULL,
                cron_expression TEXT NOT NULL,
                retain_count INTEGER DEFAULT 5,
                include_plugins INTEGER DEFAULT 1,
                include_oxide_data INTEGER DEFAULT 1,
                include_player_data INTEGER DEFAULT 1,
                include_map INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1,
                last_run TEXT,
                next_run TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (server_id) REFERENCES servers(id)
            );

            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                level TEXT NOT NULL,
                category TEXT NOT NULL,
                message TEXT NOT NULL,
                server_id TEXT,
                user_id TEXT,
                details TEXT
            );

            CREATE TABLE IF NOT EXISTS banned_players (
                steam_id TEXT PRIMARY KEY,
                server_id TEXT NOT NULL,
                name TEXT NOT NULL,
                reason TEXT,
                banned_at TEXT NOT NULL,
                banned_by TEXT NOT NULL,
                expires_at TEXT,
                FOREIGN KEY (server_id) REFERENCES servers(id)
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
            CREATE INDEX IF NOT EXISTS idx_logs_server_id ON logs(server_id);
            CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner_id);
            "
        ).map_err(|e| e.to_string())?;

        // Create default admin user if no users exist
        let count: i64 = self.conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap_or(0);

        if count == 0 {
            let id = Uuid::new_v4().to_string();
            let password_hash = bcrypt::hash("admin123", bcrypt::DEFAULT_COST)
                .map_err(|e| e.to_string())?;
            let now = Utc::now().to_rfc3339();

            self.conn.execute(
                "INSERT INTO users (id, username, email, password_hash, tier, created_at, is_active)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
                params![id, "admin", "admin@localhost", password_hash, "admin", now],
            ).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    // User operations
    pub fn create_user(&self, username: &str, email: &str, password_hash: &str) -> Result<User, String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        self.conn.execute(
            "INSERT INTO users (id, username, email, password_hash, tier, created_at, is_active)
             VALUES (?1, ?2, ?3, ?4, 'free', ?5, 1)",
            params![id, username, email, password_hash, now.to_rfc3339()],
        ).map_err(|e| e.to_string())?;

        Ok(User {
            id,
            username: username.to_string(),
            email: email.to_string(),
            password_hash: password_hash.to_string(),
            tier: UserTier::Free,
            created_at: now,
            last_login: None,
            is_active: true,
        })
    }

    pub fn get_user_by_username(&self, username: &str) -> Result<Option<User>, String> {
        let result = self.conn.query_row(
            "SELECT id, username, email, password_hash, tier, created_at, last_login, is_active
             FROM users WHERE username = ?1",
            params![username],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    email: row.get(2)?,
                    password_hash: row.get(3)?,
                    tier: UserTier::from_string(&row.get::<_, String>(4)?),
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    last_login: row.get::<_, Option<String>>(6)?
                        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                        .map(|dt| dt.with_timezone(&Utc)),
                    is_active: row.get::<_, i32>(7)? == 1,
                })
            },
        );

        match result {
            Ok(user) => Ok(Some(user)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn get_user_by_id(&self, id: &str) -> Result<Option<User>, String> {
        let result = self.conn.query_row(
            "SELECT id, username, email, password_hash, tier, created_at, last_login, is_active
             FROM users WHERE id = ?1",
            params![id],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    email: row.get(2)?,
                    password_hash: row.get(3)?,
                    tier: UserTier::from_string(&row.get::<_, String>(4)?),
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    last_login: row.get::<_, Option<String>>(6)?
                        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                        .map(|dt| dt.with_timezone(&Utc)),
                    is_active: row.get::<_, i32>(7)? == 1,
                })
            },
        );

        match result {
            Ok(user) => Ok(Some(user)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn update_user_login(&self, user_id: &str) -> Result<(), String> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE users SET last_login = ?1 WHERE id = ?2",
            params![now, user_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_all_users(&self) -> Result<Vec<User>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT id, username, email, password_hash, tier, created_at, last_login, is_active FROM users"
        ).map_err(|e| e.to_string())?;

        let users = stmt.query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                email: row.get(2)?,
                password_hash: row.get(3)?,
                tier: UserTier::from_string(&row.get::<_, String>(4)?),
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&Utc),
                last_login: row.get::<_, Option<String>>(6)?
                    .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                    .map(|dt| dt.with_timezone(&Utc)),
                is_active: row.get::<_, i32>(7)? == 1,
            })
        }).map_err(|e| e.to_string())?;

        users.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn update_user_tier(&self, user_id: &str, tier: &str) -> Result<(), String> {
        self.conn.execute(
            "UPDATE users SET tier = ?1 WHERE id = ?2",
            params![tier, user_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_user(&self, user_id: &str) -> Result<(), String> {
        self.conn.execute("DELETE FROM users WHERE id = ?1", params![user_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_password(&self, user_id: &str, password_hash: &str) -> Result<(), String> {
        self.conn.execute(
            "UPDATE users SET password_hash = ?1 WHERE id = ?2",
            params![password_hash, user_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Server operations
    pub fn create_server(&self, server: &Server) -> Result<(), String> {
        self.conn.execute(
            "INSERT INTO servers (id, name, description, ip, port, rcon_port, rcon_password,
             query_port, app_port, install_path, identity, seed, world_size, max_players,
             tickrate, server_image, header_image, server_url, map_name, custom_map_url,
             oxide_enabled, modded, created_at, owner_id, status, last_wipe, auto_start, startup_script)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28)",
            params![
                server.id, server.name, server.description, server.ip, server.port,
                server.rcon_port, server.rcon_password, server.query_port, server.app_port,
                server.install_path, server.identity, server.seed, server.world_size,
                server.max_players, server.tickrate, server.server_image, server.header_image,
                server.server_url, server.map_name, server.custom_map_url,
                server.oxide_enabled as i32, server.modded as i32, server.created_at.to_rfc3339(),
                server.owner_id, server.status.to_string(),
                server.last_wipe.map(|dt| dt.to_rfc3339()),
                server.auto_start as i32, server.startup_script
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_servers_by_owner(&self, owner_id: &str) -> Result<Vec<Server>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM servers WHERE owner_id = ?1"
        ).map_err(|e| e.to_string())?;

        let servers = stmt.query_map(params![owner_id], |row| {
            Self::row_to_server(row)
        }).map_err(|e| e.to_string())?;

        servers.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn get_server(&self, server_id: &str) -> Result<Option<Server>, String> {
        let result = self.conn.query_row(
            "SELECT * FROM servers WHERE id = ?1",
            params![server_id],
            |row| Self::row_to_server(row),
        );

        match result {
            Ok(server) => Ok(Some(server)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    fn row_to_server(row: &rusqlite::Row) -> Result<Server, rusqlite::Error> {
        Ok(Server {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            ip: row.get(3)?,
            port: row.get(4)?,
            rcon_port: row.get(5)?,
            rcon_password: row.get(6)?,
            query_port: row.get(7)?,
            app_port: row.get(8)?,
            install_path: row.get(9)?,
            identity: row.get(10)?,
            seed: row.get(11)?,
            world_size: row.get(12)?,
            max_players: row.get(13)?,
            tickrate: row.get(14)?,
            server_image: row.get(15)?,
            header_image: row.get(16)?,
            server_url: row.get(17)?,
            map_name: row.get(18)?,
            custom_map_url: row.get(19)?,
            oxide_enabled: row.get::<_, i32>(20)? == 1,
            modded: row.get::<_, i32>(21)? == 1,
            created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(22)?)
                .unwrap()
                .with_timezone(&Utc),
            owner_id: row.get(23)?,
            status: ServerStatus::from_string(&row.get::<_, String>(24)?),
            last_wipe: row.get::<_, Option<String>>(25)?
                .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
            auto_start: row.get::<_, i32>(26)? == 1,
            startup_script: row.get(27)?,
        })
    }

    pub fn update_server(&self, server: &Server) -> Result<(), String> {
        self.conn.execute(
            "UPDATE servers SET name = ?1, description = ?2, ip = ?3, port = ?4, rcon_port = ?5,
             rcon_password = ?6, query_port = ?7, app_port = ?8, install_path = ?9, identity = ?10,
             seed = ?11, world_size = ?12, max_players = ?13, tickrate = ?14, server_image = ?15,
             header_image = ?16, server_url = ?17, map_name = ?18, custom_map_url = ?19,
             oxide_enabled = ?20, modded = ?21, status = ?22, last_wipe = ?23, auto_start = ?24,
             startup_script = ?25 WHERE id = ?26",
            params![
                server.name, server.description, server.ip, server.port, server.rcon_port,
                server.rcon_password, server.query_port, server.app_port, server.install_path,
                server.identity, server.seed, server.world_size, server.max_players,
                server.tickrate, server.server_image, server.header_image, server.server_url,
                server.map_name, server.custom_map_url, server.oxide_enabled as i32,
                server.modded as i32, server.status.to_string(),
                server.last_wipe.map(|dt| dt.to_rfc3339()), server.auto_start as i32,
                server.startup_script, server.id
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_server_status(&self, server_id: &str, status: &str) -> Result<(), String> {
        self.conn.execute(
            "UPDATE servers SET status = ?1 WHERE id = ?2",
            params![status, server_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_server(&self, server_id: &str) -> Result<(), String> {
        self.conn.execute("DELETE FROM servers WHERE id = ?1", params![server_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Server permissions
    pub fn get_server_permissions(&self, user_id: &str) -> Result<Vec<ServerPermission>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM server_permissions WHERE user_id = ?1"
        ).map_err(|e| e.to_string())?;

        let perms = stmt.query_map(params![user_id], |row| {
            Ok(ServerPermission {
                id: row.get(0)?,
                user_id: row.get(1)?,
                server_id: row.get(2)?,
                can_view: row.get::<_, i32>(3)? == 1,
                can_console: row.get::<_, i32>(4)? == 1,
                can_players: row.get::<_, i32>(5)? == 1,
                can_plugins: row.get::<_, i32>(6)? == 1,
                can_config: row.get::<_, i32>(7)? == 1,
                can_restart: row.get::<_, i32>(8)? == 1,
                can_wipe: row.get::<_, i32>(9)? == 1,
                can_backup: row.get::<_, i32>(10)? == 1,
                assigned_by: row.get(11)?,
                assigned_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        }).map_err(|e| e.to_string())?;

        perms.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn assign_server_permission(&self, perm: &ServerPermission) -> Result<(), String> {
        self.conn.execute(
            "INSERT OR REPLACE INTO server_permissions
             (id, user_id, server_id, can_view, can_console, can_players, can_plugins,
              can_config, can_restart, can_wipe, can_backup, assigned_by, assigned_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                perm.id, perm.user_id, perm.server_id, perm.can_view as i32,
                perm.can_console as i32, perm.can_players as i32, perm.can_plugins as i32,
                perm.can_config as i32, perm.can_restart as i32, perm.can_wipe as i32,
                perm.can_backup as i32, perm.assigned_by, perm.assigned_at.to_rfc3339()
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn revoke_server_permission(&self, user_id: &str, server_id: &str) -> Result<(), String> {
        self.conn.execute(
            "DELETE FROM server_permissions WHERE user_id = ?1 AND server_id = ?2",
            params![user_id, server_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Logging
    pub fn add_log(&self, entry: &LogEntry) -> Result<(), String> {
        self.conn.execute(
            "INSERT INTO logs (id, timestamp, level, category, message, server_id, user_id, details)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                entry.id, entry.timestamp.to_rfc3339(), entry.level.to_string(),
                entry.category, entry.message, entry.server_id, entry.user_id, entry.details
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_logs(&self, server_id: Option<&str>, limit: u32) -> Result<Vec<LogEntry>, String> {
        let query = match server_id {
            Some(_) => "SELECT * FROM logs WHERE server_id = ?1 ORDER BY timestamp DESC LIMIT ?2",
            None => "SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?1",
        };

        let mut stmt = self.conn.prepare(query).map_err(|e| e.to_string())?;

        let logs = if let Some(sid) = server_id {
            stmt.query_map(params![sid, limit], Self::row_to_log)
        } else {
            stmt.query_map(params![limit], Self::row_to_log)
        }.map_err(|e| e.to_string())?;

        logs.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    fn row_to_log(row: &rusqlite::Row) -> Result<LogEntry, rusqlite::Error> {
        Ok(LogEntry {
            id: row.get(0)?,
            timestamp: DateTime::parse_from_rfc3339(&row.get::<_, String>(1)?)
                .unwrap()
                .with_timezone(&Utc),
            level: LogLevel::from_string(&row.get::<_, String>(2)?),
            category: row.get(3)?,
            message: row.get(4)?,
            server_id: row.get(5)?,
            user_id: row.get(6)?,
            details: row.get(7)?,
        })
    }

    pub fn clear_logs(&self, before: Option<DateTime<Utc>>) -> Result<u32, String> {
        let count = if let Some(dt) = before {
            self.conn.execute(
                "DELETE FROM logs WHERE timestamp < ?1",
                params![dt.to_rfc3339()],
            )
        } else {
            self.conn.execute("DELETE FROM logs", [])
        }.map_err(|e| e.to_string())?;

        Ok(count as u32)
    }

    // Wipe schedules
    pub fn create_wipe_schedule(&self, schedule: &WipeSchedule) -> Result<(), String> {
        self.conn.execute(
            "INSERT INTO wipe_schedules
             (id, server_id, name, cron_expression, wipe_blueprints, wipe_map, wipe_player_data,
              new_seed, custom_seed, pre_wipe_message, countdown_minutes, is_active, last_run, next_run, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                schedule.id, schedule.server_id, schedule.name, schedule.cron_expression,
                schedule.wipe_blueprints as i32, schedule.wipe_map as i32,
                schedule.wipe_player_data as i32, schedule.new_seed as i32,
                schedule.custom_seed, schedule.pre_wipe_message, schedule.countdown_minutes,
                schedule.is_active as i32, schedule.last_run.map(|dt| dt.to_rfc3339()),
                schedule.next_run.map(|dt| dt.to_rfc3339()), schedule.created_at.to_rfc3339()
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_wipe_schedules(&self, server_id: &str) -> Result<Vec<WipeSchedule>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM wipe_schedules WHERE server_id = ?1"
        ).map_err(|e| e.to_string())?;

        let schedules = stmt.query_map(params![server_id], |row| {
            Ok(WipeSchedule {
                id: row.get(0)?,
                server_id: row.get(1)?,
                name: row.get(2)?,
                cron_expression: row.get(3)?,
                wipe_blueprints: row.get::<_, i32>(4)? == 1,
                wipe_map: row.get::<_, i32>(5)? == 1,
                wipe_player_data: row.get::<_, i32>(6)? == 1,
                new_seed: row.get::<_, i32>(7)? == 1,
                custom_seed: row.get(8)?,
                pre_wipe_message: row.get(9)?,
                countdown_minutes: row.get(10)?,
                is_active: row.get::<_, i32>(11)? == 1,
                last_run: row.get::<_, Option<String>>(12)?
                    .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                    .map(|dt| dt.with_timezone(&Utc)),
                next_run: row.get::<_, Option<String>>(13)?
                    .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                    .map(|dt| dt.with_timezone(&Utc)),
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(14)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        }).map_err(|e| e.to_string())?;

        schedules.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn delete_wipe_schedule(&self, schedule_id: &str) -> Result<(), String> {
        self.conn.execute("DELETE FROM wipe_schedules WHERE id = ?1", params![schedule_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Backups
    pub fn create_backup_record(&self, backup: &Backup) -> Result<(), String> {
        self.conn.execute(
            "INSERT INTO backups
             (id, server_id, name, path, size_bytes, created_at, backup_type,
              include_plugins, include_oxide_data, include_player_data, include_map)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                backup.id, backup.server_id, backup.name, backup.path, backup.size_bytes,
                backup.created_at.to_rfc3339(), backup.backup_type.to_string(),
                backup.include_plugins as i32, backup.include_oxide_data as i32,
                backup.include_player_data as i32, backup.include_map as i32
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_backups(&self, server_id: &str) -> Result<Vec<Backup>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM backups WHERE server_id = ?1 ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;

        let backups = stmt.query_map(params![server_id], |row| {
            Ok(Backup {
                id: row.get(0)?,
                server_id: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                size_bytes: row.get(4)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&Utc),
                backup_type: BackupType::from_string(&row.get::<_, String>(6)?),
                include_plugins: row.get::<_, i32>(7)? == 1,
                include_oxide_data: row.get::<_, i32>(8)? == 1,
                include_player_data: row.get::<_, i32>(9)? == 1,
                include_map: row.get::<_, i32>(10)? == 1,
            })
        }).map_err(|e| e.to_string())?;

        backups.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn delete_backup_record(&self, backup_id: &str) -> Result<(), String> {
        self.conn.execute("DELETE FROM backups WHERE id = ?1", params![backup_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

// Tauri commands for logging
#[tauri::command]
pub async fn get_logs(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    server_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<LogEntry>, String> {
    let db = db.lock().await;
    db.get_logs(server_id.as_deref(), limit.unwrap_or(100))
}

#[tauri::command]
pub async fn add_log(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    level: String,
    category: String,
    message: String,
    server_id: Option<String>,
    user_id: Option<String>,
    details: Option<String>,
) -> Result<(), String> {
    let db = db.lock().await;
    let entry = LogEntry {
        id: Uuid::new_v4().to_string(),
        timestamp: Utc::now(),
        level: LogLevel::from_string(&level),
        category,
        message,
        server_id,
        user_id,
        details,
    };
    db.add_log(&entry)
}

#[tauri::command]
pub async fn clear_logs(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    before_days: Option<u32>,
) -> Result<u32, String> {
    let db = db.lock().await;
    let before = before_days.map(|days| {
        Utc::now() - chrono::Duration::days(days as i64)
    });
    db.clear_logs(before)
}
