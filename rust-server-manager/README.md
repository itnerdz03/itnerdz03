# Rust Server Manager

A comprehensive Windows Desktop Application for managing FacePunch Rust dedicated servers. Built with Tauri (Rust backend) and React/TypeScript frontend.

## Features

### Server Management
- **Add/Remove Servers** - Easily configure multiple Rust servers
- **Start/Stop/Restart** - Full server lifecycle control
- **Real-time Stats** - Monitor players online, FPS, RAM, CPU, entities
- **Server Deployment** - Automated installation via SteamCMD
- **Startup Script Generator** - Build custom startup scripts with prompts

### RCON Console
- **WebSocket RCON** - Real-time connection to Rust's RCON2 protocol
- **Live Feedback** - See server responses instantly
- **Command History** - Navigate through previous commands with arrow keys
- **Color-coded Output** - Distinguish between commands, responses, errors

### Player Management
- **Player List** - View all connected players with stats
- **Kick/Ban** - Remove players with optional reasons and durations
- **Mute/Unmute** - Control player chat
- **Teleport** - Move players to coordinates
- **Give Items** - Send items to players
- **Private Messages** - Send messages to specific players

### Plugin Manager
- **View Installed Plugins** - List all Oxide/uMod plugins
- **Load/Unload/Reload** - Control plugin state via RCON
- **Install Plugins** - Upload .cs plugin files
- **Oxide Installation** - One-click Oxide/Carbon installation
- **Version Tracking** - Monitor plugin versions

### Wipe Manager
- **Scheduled Wipes** - Set up automated wipe schedules (cron-based)
- **Wipe Options** - Choose what to wipe:
  - Map only
  - Blueprints
  - Player data
  - Full wipe
- **New Seed Generation** - Automatically generate new map seeds
- **Pre-wipe Warnings** - Send countdown messages to players

### Backup System
- **Manual Backups** - Create backups on demand
- **Scheduled Backups** - Automate backup creation
- **Selective Backup** - Choose what to include:
  - Map data
  - Player data
  - Plugins
  - Oxide config/data
- **Restore** - Restore from any backup
- **Backup Retention** - Manage backup count

### Map Manager
- **Built-in Maps** - Procedural, Barren, Hapis Island, Savas Island
- **Custom Maps** - Upload and use custom .map files
- **Map URLs** - Load maps from RustMaps.com or other sources
- **Map Switching** - Easy map changes between wipes

### Authentication & Permissions
- **User Registration** - Create accounts with email
- **Login/Logout** - Secure authentication
- **Password Recovery** - Reset forgotten passwords
- **Remember Me** - Optional persistent login
- **Role-based Permissions** - Assign server access to admins/mods

### Tier System
- **Free Tier** - 1 server, basic RCON, player management
- **Basic Tier** - 3 servers, plugin manager, wipe scheduler
- **Pro Tier** - 10 servers, backup manager, auto updates, custom maps
- **Enterprise Tier** - Unlimited servers, server deployment, multi-admin
- **Admin Tier** - Full access to all features

### Logging
- **Action Logs** - Track all admin actions
- **Server Logs** - View server console output
- **Filter & Search** - Find specific log entries
- **Export** - Download logs as JSON

### Update Manager
- **Rust Server Updates** - Update via SteamCMD
- **Oxide Updates** - Keep Oxide/Carbon current
- **Pre-update Backups** - Automatic backup before updates

## Tech Stack

### Backend (Tauri/Rust)
- **Tauri** - Native Windows application framework
- **tokio** - Async runtime
- **tokio-tungstenite** - WebSocket client for RCON
- **rusqlite** - SQLite database
- **bcrypt** - Password hashing
- **serde** - JSON serialization
- **chrono** - Date/time handling

### Frontend (React/TypeScript)
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Material UI** - Component library
- **Zustand** - State management
- **React Router** - Navigation
- **Chart.js** - Statistics charts
- **Vite** - Build tool

## Installation

### Prerequisites
- Windows 10/11
- Node.js 18+ and npm
- Rust 1.70+
- Visual Studio Build Tools (for Tauri)

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/itnerdz03/rust-server-manager.git
cd rust-server-manager
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run tauri:dev
```

4. Build for production:
```bash
npm run tauri:build
```

The built application will be in `src-tauri/target/release/`.

## Usage

### First Launch
1. Launch the application
2. Login with default credentials: `admin` / `admin123`
3. **Change the default password immediately**

### Adding a Server
1. Go to Dashboard or Servers page
2. Click "Add Server"
3. Fill in server details:
   - Name and description
   - Installation path
   - IP address and ports
   - RCON password
   - Map settings (size, seed)
4. Click "Create Server"

### Connecting RCON
1. Select a server
2. Ensure the server is running
3. Navigate to Console page
4. RCON will auto-connect when server is online

### Managing Players
1. Select a server
2. Go to Players page
3. Use action buttons to:
   - Kick/Ban players
   - Mute/Unmute
   - Teleport
   - Give items
   - Send messages

### Installing Plugins
1. Select a server
2. Go to Plugins page
3. Install Oxide first if not installed
4. Click "Install Plugin" to upload .cs files
5. Use Load/Unload/Reload buttons to manage

### Scheduling Wipes
1. Select a server
2. Go to Wipe Manager
3. Click "Create Schedule"
4. Configure:
   - Schedule (cron expression)
   - What to wipe (map, BPs, player data)
   - Pre-wipe message and countdown
5. Enable the schedule

## Configuration

### Server Configuration
Each server stores:
- Connection details (IP, ports, RCON password)
- World settings (seed, size, max players)
- Oxide/modded status
- Startup script

### RCON Settings
- RCON uses WebSocket (Rust's RCON2 protocol)
- Default port: 28016
- Ensure RCON is enabled in server startup

### Firewall Requirements
Open these ports:
- Game port (default 28015)
- RCON port (default 28016)
- Query port (default 28017)
- Rust+ App port (default 28082)

## Project Structure

```
rust-server-manager/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── auth.rs         # Authentication
│   │   ├── database.rs     # SQLite operations
│   │   ├── rcon.rs         # RCON WebSocket
│   │   ├── server_manager.rs # Server operations
│   │   ├── plugins.rs      # Plugin management
│   │   ├── backup.rs       # Backup operations
│   │   └── models.rs       # Data models
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── package.json            # Node dependencies
└── README.md               # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details.

## Credits

Inspired by [MyRustServer](https://myrustserver.com) and similar Rust server management tools.

## Support

For issues and feature requests, please use the GitHub Issues page.
