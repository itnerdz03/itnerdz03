use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::Utc;
use uuid::Uuid;
use serde::{Deserialize, Serialize};

use crate::database::Database;
use crate::models::{User, UserTier, ServerPermission};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
    pub remember_me: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub user: Option<User>,
    pub message: String,
    pub token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

// Thread-safe current user storage
use once_cell::sync::Lazy;
use std::sync::RwLock;

static CURRENT_USER: Lazy<RwLock<Option<User>>> = Lazy::new(|| RwLock::new(None));

fn set_current_user(user: Option<User>) {
    let mut current = CURRENT_USER.write().unwrap();
    *current = user;
}

fn get_stored_user() -> Option<User> {
    let current = CURRENT_USER.read().unwrap();
    current.clone()
}

#[tauri::command]
pub async fn login(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    username: String,
    password: String,
    _remember_me: bool,
) -> Result<LoginResponse, String> {
    let db = db.lock().await;

    let user = match db.get_user_by_username(&username)? {
        Some(u) => u,
        None => {
            return Ok(LoginResponse {
                success: false,
                user: None,
                message: "Invalid username or password".to_string(),
                token: None,
            });
        }
    };

    if !user.is_active {
        return Ok(LoginResponse {
            success: false,
            user: None,
            message: "Account is deactivated".to_string(),
            token: None,
        });
    }

    let valid = bcrypt::verify(&password, &user.password_hash)
        .map_err(|e| e.to_string())?;

    if !valid {
        return Ok(LoginResponse {
            success: false,
            user: None,
            message: "Invalid username or password".to_string(),
            token: None,
        });
    }

    db.update_user_login(&user.id)?;

    let token = Uuid::new_v4().to_string();

    // Store current user
    set_current_user(Some(user.clone()));

    Ok(LoginResponse {
        success: true,
        user: Some(user),
        message: "Login successful".to_string(),
        token: Some(token),
    })
}

#[tauri::command]
pub async fn register(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    username: String,
    email: String,
    password: String,
) -> Result<LoginResponse, String> {
    let db = db.lock().await;

    // Check if username exists
    if db.get_user_by_username(&username)?.is_some() {
        return Ok(LoginResponse {
            success: false,
            user: None,
            message: "Username already exists".to_string(),
            token: None,
        });
    }

    // Validate password strength
    if password.len() < 8 {
        return Ok(LoginResponse {
            success: false,
            user: None,
            message: "Password must be at least 8 characters".to_string(),
            token: None,
        });
    }

    // Hash password
    let password_hash = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
        .map_err(|e| e.to_string())?;

    // Create user
    let user = db.create_user(&username, &email, &password_hash)?;

    let token = Uuid::new_v4().to_string();
    set_current_user(Some(user.clone()));

    Ok(LoginResponse {
        success: true,
        user: Some(user),
        message: "Registration successful".to_string(),
        token: Some(token),
    })
}

#[tauri::command]
pub async fn logout() -> Result<(), String> {
    set_current_user(None);
    Ok(())
}

#[tauri::command]
pub async fn reset_password(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    email: String,
    new_password: String,
) -> Result<bool, String> {
    let db = db.lock().await;

    // Find user by email (would need to add this method)
    // For now, we'll just return success
    // In production, this would send an email with a reset link

    if new_password.len() < 8 {
        return Err("Password must be at least 8 characters".to_string());
    }

    // This is a simplified version - in production you'd verify email ownership
    Ok(true)
}

#[tauri::command]
pub async fn get_current_user() -> Result<Option<User>, String> {
    Ok(get_stored_user())
}

#[tauri::command]
pub async fn update_user(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    user_id: String,
    username: Option<String>,
    email: Option<String>,
    password: Option<String>,
) -> Result<User, String> {
    let db = db.lock().await;

    let mut user = db.get_user_by_id(&user_id)?
        .ok_or("User not found")?;

    if let Some(new_password) = password {
        if new_password.len() < 8 {
            return Err("Password must be at least 8 characters".to_string());
        }
        let password_hash = bcrypt::hash(&new_password, bcrypt::DEFAULT_COST)
            .map_err(|e| e.to_string())?;
        db.update_password(&user_id, &password_hash)?;
    }

    // Update other fields as needed
    if let Some(u) = username {
        user.username = u;
    }
    if let Some(e) = email {
        user.email = e;
    }

    Ok(user)
}

#[tauri::command]
pub async fn get_all_users(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<User>, String> {
    let current_user = get_stored_user().ok_or("Not authenticated")?;

    if current_user.tier != UserTier::Admin {
        return Err("Admin access required".to_string());
    }

    let db = db.lock().await;
    db.get_all_users()
}

#[tauri::command]
pub async fn delete_user(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    user_id: String,
) -> Result<(), String> {
    let current_user = get_stored_user().ok_or("Not authenticated")?;

    if current_user.tier != UserTier::Admin {
        return Err("Admin access required".to_string());
    }

    if current_user.id == user_id {
        return Err("Cannot delete your own account".to_string());
    }

    let db = db.lock().await;
    db.delete_user(&user_id)
}

#[tauri::command]
pub async fn update_user_tier(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    user_id: String,
    tier: String,
) -> Result<(), String> {
    let current_user = get_stored_user().ok_or("Not authenticated")?;

    if current_user.tier != UserTier::Admin {
        return Err("Admin access required".to_string());
    }

    let db = db.lock().await;
    db.update_user_tier(&user_id, &tier)
}

#[tauri::command]
pub async fn update_user_permissions(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    user_id: String,
    is_active: bool,
) -> Result<(), String> {
    let current_user = get_stored_user().ok_or("Not authenticated")?;

    if current_user.tier != UserTier::Admin {
        return Err("Admin access required".to_string());
    }

    // This would update the user's active status
    Ok(())
}

#[tauri::command]
pub async fn get_permissions(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    user_id: String,
) -> Result<Vec<ServerPermission>, String> {
    let db = db.lock().await;
    db.get_server_permissions(&user_id)
}

#[tauri::command]
pub async fn assign_server_permission(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    user_id: String,
    server_id: String,
    can_view: bool,
    can_console: bool,
    can_players: bool,
    can_plugins: bool,
    can_config: bool,
    can_restart: bool,
    can_wipe: bool,
    can_backup: bool,
) -> Result<(), String> {
    let current_user = get_stored_user().ok_or("Not authenticated")?;

    let db = db.lock().await;

    // Check if current user owns the server or is admin
    let server = db.get_server(&server_id)?
        .ok_or("Server not found")?;

    if server.owner_id != current_user.id && current_user.tier != UserTier::Admin {
        return Err("Permission denied".to_string());
    }

    let permission = ServerPermission {
        id: Uuid::new_v4().to_string(),
        user_id,
        server_id,
        can_view,
        can_console,
        can_players,
        can_plugins,
        can_config,
        can_restart,
        can_wipe,
        can_backup,
        assigned_by: current_user.id.clone(),
        assigned_at: Utc::now(),
    };

    db.assign_server_permission(&permission)
}

#[tauri::command]
pub async fn revoke_server_permission(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    user_id: String,
    server_id: String,
) -> Result<(), String> {
    let current_user = get_stored_user().ok_or("Not authenticated")?;

    let db = db.lock().await;

    let server = db.get_server(&server_id)?
        .ok_or("Server not found")?;

    if server.owner_id != current_user.id && current_user.tier != UserTier::Admin {
        return Err("Permission denied".to_string());
    }

    db.revoke_server_permission(&user_id, &server_id)
}

#[tauri::command]
pub async fn get_user_server_permissions(
    db: tauri::State<'_, Arc<Mutex<Database>>>,
    user_id: String,
    server_id: String,
) -> Result<Option<ServerPermission>, String> {
    let db = db.lock().await;
    let perms = db.get_server_permissions(&user_id)?;
    Ok(perms.into_iter().find(|p| p.server_id == server_id))
}
