// User types
export interface User {
  id: string;
  username: string;
  email: string;
  tier: UserTier;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

export type UserTier = 'free' | 'basic' | 'pro' | 'enterprise' | 'admin';

export interface LoginResponse {
  success: boolean;
  user: User | null;
  message: string;
  token: string | null;
}

// Server types
export interface Server {
  id: string;
  name: string;
  description: string;
  ip: string;
  port: number;
  rcon_port: number;
  rcon_password: string;
  query_port: number;
  app_port: number;
  install_path: string;
  identity: string;
  seed: number;
  world_size: number;
  max_players: number;
  tickrate: number;
  server_image: string | null;
  header_image: string | null;
  server_url: string | null;
  map_name: string;
  custom_map_url: string | null;
  oxide_enabled: boolean;
  modded: boolean;
  created_at: string;
  owner_id: string;
  status: ServerStatus;
  last_wipe: string | null;
  auto_start: boolean;
  startup_script: string | null;
}

export type ServerStatus =
  | 'offline'
  | 'starting'
  | 'online'
  | 'stopping'
  | 'restarting'
  | 'updating'
  | string; // for error:message format

export interface ServerStats {
  server_id: string;
  players_online: number;
  max_players: number;
  fps: number;
  ram_usage_mb: number;
  cpu_usage_percent: number;
  uptime_seconds: number;
  entities: number;
  network_in: number;
  network_out: number;
  queued_players: number;
  joining_players: number;
  timestamp: string;
}

export interface NewServerRequest {
  name: string;
  description: string;
  ip: string;
  port: number;
  rcon_port: number;
  rcon_password: string;
  query_port: number;
  app_port: number;
  install_path: string;
  identity: string;
  seed: number;
  world_size: number;
  max_players: number;
  tickrate: number;
  map_name: string;
  oxide_enabled: boolean;
}

// Player types
export interface Player {
  steam_id: string;
  name: string;
  ping: number;
  address: string;
  connected_seconds: number;
  health: number;
  position: Position | null;
  is_muted: boolean;
  is_admin: boolean;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface BannedPlayer {
  steam_id: string;
  name: string;
  reason: string;
  banned_at: string;
  banned_by: string;
  expires_at: string | null;
}

// Plugin types
export interface Plugin {
  name: string;
  filename: string;
  version: string;
  author: string;
  description: string;
  is_loaded: boolean;
  resource_id: number | null;
  latest_version: string | null;
  needs_update: boolean;
}

export interface AvailablePlugin {
  name: string;
  author: string;
  version: string;
  description: string;
  resource_id: number | null;
  download_url: string | null;
}

// Wipe types
export interface WipeSchedule {
  id: string;
  server_id: string;
  name: string;
  cron_expression: string;
  wipe_blueprints: boolean;
  wipe_map: boolean;
  wipe_player_data: boolean;
  new_seed: boolean;
  custom_seed: number | null;
  pre_wipe_message: string | null;
  countdown_minutes: number;
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
}

// Backup types
export interface Backup {
  id: string;
  server_id: string;
  name: string;
  path: string;
  size_bytes: number;
  created_at: string;
  backup_type: BackupType;
  include_plugins: boolean;
  include_oxide_data: boolean;
  include_player_data: boolean;
  include_map: boolean;
}

export type BackupType = 'manual' | 'scheduled' | 'pre_wipe' | 'pre_update';

export interface BackupSchedule {
  id: string;
  server_id: string;
  name: string;
  cron_expression: string;
  retain_count: number;
  include_plugins: boolean;
  include_oxide_data: boolean;
  include_player_data: boolean;
  include_map: boolean;
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
}

// Log types
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  server_id: string | null;
  user_id: string | null;
  details: string | null;
}

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

// Permission types
export interface ServerPermission {
  id: string;
  user_id: string;
  server_id: string;
  can_view: boolean;
  can_console: boolean;
  can_players: boolean;
  can_plugins: boolean;
  can_config: boolean;
  can_restart: boolean;
  can_wipe: boolean;
  can_backup: boolean;
  assigned_by: string;
  assigned_at: string;
}

// Map types
export interface RustMap {
  name: string;
  path: string | null;
  is_custom: boolean;
  size: number | null;
  procedural_size: number | null;
}

// Console types
export interface ConsoleMessage {
  timestamp: string;
  message: string;
  message_type: ConsoleMessageType;
}

export type ConsoleMessageType = 'info' | 'warning' | 'error' | 'chat' | 'command' | 'response';

// Tier features
export const TIER_FEATURES: Record<UserTier, string[]> = {
  free: ['1 Server', 'Basic RCON', 'Player Management', 'Console'],
  basic: ['3 Servers', 'Plugin Manager', 'Wipe Scheduler', 'All Free Features'],
  pro: ['10 Servers', 'Backup Manager', 'Auto Updates', 'Custom Maps', 'All Basic Features'],
  enterprise: ['Unlimited Servers', 'Server Deployment', 'Multi-Admin', 'Priority Support', 'All Pro Features'],
  admin: ['Full Access', 'User Management', 'All Features'],
};

export const TIER_MAX_SERVERS: Record<UserTier, number> = {
  free: 1,
  basic: 3,
  pro: 10,
  enterprise: 100,
  admin: 1000,
};
