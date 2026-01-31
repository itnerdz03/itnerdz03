use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

use crate::models::ConsoleMessage;

#[derive(Debug, Clone)]
pub struct RconConnection {
    pub server_id: String,
    pub ip: String,
    pub port: u16,
    pub password: String,
    pub connected: bool,
    pub identifier: i32,
}

pub struct RconManager {
    connections: HashMap<String, RconConnection>,
    message_history: HashMap<String, Vec<ConsoleMessage>>,
    next_identifier: i32,
}

impl RconManager {
    pub fn new() -> Self {
        RconManager {
            connections: HashMap::new(),
            message_history: HashMap::new(),
            next_identifier: 1,
        }
    }

    pub fn get_connection(&self, server_id: &str) -> Option<&RconConnection> {
        self.connections.get(server_id)
    }

    pub fn add_connection(&mut self, server_id: String, ip: String, port: u16, password: String) {
        let identifier = self.next_identifier;
        self.next_identifier += 1;

        self.connections.insert(server_id.clone(), RconConnection {
            server_id,
            ip,
            port,
            password,
            connected: false,
            identifier,
        });
    }

    pub fn set_connected(&mut self, server_id: &str, connected: bool) {
        if let Some(conn) = self.connections.get_mut(server_id) {
            conn.connected = connected;
        }
    }

    pub fn remove_connection(&mut self, server_id: &str) {
        self.connections.remove(server_id);
    }

    pub fn add_message(&mut self, server_id: &str, message: ConsoleMessage) {
        let history = self.message_history.entry(server_id.to_string()).or_insert_with(Vec::new);
        history.push(message);

        // Keep only last 1000 messages
        if history.len() > 1000 {
            history.drain(0..100);
        }
    }

    pub fn get_messages(&self, server_id: &str) -> Vec<ConsoleMessage> {
        self.message_history.get(server_id).cloned().unwrap_or_default()
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct RconPacket {
    #[serde(rename = "Identifier")]
    identifier: i32,
    #[serde(rename = "Message")]
    message: String,
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "Type")]
    packet_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct RconResponse {
    #[serde(rename = "Identifier")]
    identifier: i32,
    #[serde(rename = "Message")]
    message: String,
    #[serde(rename = "Type")]
    response_type: String,
    #[serde(rename = "Stacktrace")]
    stacktrace: Option<String>,
}

#[tauri::command]
pub async fn connect_rcon(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    ip: String,
    port: u16,
    password: String,
) -> Result<bool, String> {
    let url = format!("ws://{}:{}/{}", ip, port, password);

    // Test connection
    match connect_async(&url).await {
        Ok((ws_stream, _)) => {
            let (mut write, _read) = ws_stream.split();

            // Send a test command
            let test_packet = RconPacket {
                identifier: 1,
                message: "serverinfo".to_string(),
                name: "RustServerManager".to_string(),
                packet_type: "Generic".to_string(),
            };

            let packet_json = serde_json::to_string(&test_packet)
                .map_err(|e| e.to_string())?;

            write.send(Message::Text(packet_json)).await
                .map_err(|e| e.to_string())?;

            // Store connection info
            let mut manager = rcon_manager.lock().await;
            manager.add_connection(server_id.clone(), ip, port, password);
            manager.set_connected(&server_id, true);

            Ok(true)
        }
        Err(e) => {
            Err(format!("Failed to connect: {}", e))
        }
    }
}

#[tauri::command]
pub async fn disconnect_rcon(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
) -> Result<(), String> {
    let mut manager = rcon_manager.lock().await;
    manager.set_connected(&server_id, false);
    manager.remove_connection(&server_id);
    Ok(())
}

#[tauri::command]
pub async fn send_command(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
    command: String,
) -> Result<String, String> {
    let manager = rcon_manager.lock().await;

    let conn = manager.get_connection(&server_id)
        .ok_or("Not connected to server")?;

    if !conn.connected {
        return Err("Not connected to server".to_string());
    }

    let url = format!("ws://{}:{}/{}", conn.ip, conn.port, conn.password);
    drop(manager); // Release lock before async operation

    let (ws_stream, _) = connect_async(&url).await
        .map_err(|e| format!("Connection failed: {}", e))?;

    let (mut write, mut read) = ws_stream.split();

    let packet = RconPacket {
        identifier: 1,
        message: command.clone(),
        name: "RustServerManager".to_string(),
        packet_type: "Generic".to_string(),
    };

    let packet_json = serde_json::to_string(&packet)
        .map_err(|e| e.to_string())?;

    write.send(Message::Text(packet_json)).await
        .map_err(|e| e.to_string())?;

    // Wait for response with timeout
    let mut response = String::new();

    // Use a simple timeout mechanism
    let timeout = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        async {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(resp) = serde_json::from_str::<RconResponse>(&text) {
                            if resp.identifier == 1 {
                                return resp.message;
                            }
                        }
                    }
                    _ => continue,
                }
            }
            String::new()
        }
    ).await;

    match timeout {
        Ok(msg) => response = msg,
        Err(_) => return Err("Command timeout".to_string()),
    }

    // Store command in history
    let mut manager = rcon_manager.lock().await;
    manager.add_message(&server_id, ConsoleMessage {
        timestamp: Utc::now(),
        message: format!("> {}", command),
        message_type: crate::models::ConsoleMessageType::Command,
    });
    manager.add_message(&server_id, ConsoleMessage {
        timestamp: Utc::now(),
        message: response.clone(),
        message_type: crate::models::ConsoleMessageType::Response,
    });

    Ok(response)
}

#[tauri::command]
pub async fn get_rcon_status(
    rcon_manager: tauri::State<'_, Arc<Mutex<RconManager>>>,
    server_id: String,
) -> Result<bool, String> {
    let manager = rcon_manager.lock().await;
    Ok(manager.get_connection(&server_id)
        .map(|c| c.connected)
        .unwrap_or(false))
}

// Helper function for parsing server info
pub fn parse_server_info(response: &str) -> HashMap<String, String> {
    let mut info = HashMap::new();

    for line in response.lines() {
        if let Some((key, value)) = line.split_once(':') {
            info.insert(
                key.trim().to_lowercase().replace(" ", "_"),
                value.trim().to_string()
            );
        }
    }

    info
}

// Helper function for parsing player list
pub fn parse_player_list(response: &str) -> Vec<HashMap<String, String>> {
    let mut players = Vec::new();

    for line in response.lines().skip(1) { // Skip header
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 5 {
            let mut player = HashMap::new();
            player.insert("steam_id".to_string(), parts[0].to_string());
            player.insert("name".to_string(), parts[1..parts.len()-3].join(" "));
            player.insert("ping".to_string(), parts[parts.len()-3].to_string());
            player.insert("address".to_string(), parts[parts.len()-2].to_string());
            player.insert("connected".to_string(), parts[parts.len()-1].to_string());
            players.push(player);
        }
    }

    players
}
