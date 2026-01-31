import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/tauri';
import type {
  User,
  Server,
  ServerStats,
  Player,
  Plugin,
  WipeSchedule,
  Backup,
  LogEntry,
  ConsoleMessage,
  ServerPermission,
  RustMap,
  LoginResponse,
  NewServerRequest,
} from '../types';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;

  // Servers
  servers: Server[];
  selectedServer: Server | null;
  serverStats: Record<string, ServerStats>;
  rconConnected: Record<string, boolean>;

  // Players
  players: Player[];

  // Plugins
  plugins: Plugin[];

  // Console
  consoleMessages: ConsoleMessage[];

  // Wipes
  wipeSchedules: WipeSchedule[];

  // Backups
  backups: Backup[];

  // Logs
  logs: LogEntry[];

  // Maps
  maps: RustMap[];

  // Permissions
  userPermissions: ServerPermission[];

  // UI State
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string, rememberMe: boolean) => Promise<LoginResponse>;
  register: (username: string, email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;

  loadServers: () => Promise<void>;
  selectServer: (server: Server | null) => void;
  addServer: (request: NewServerRequest) => Promise<Server>;
  removeServer: (serverId: string) => Promise<void>;
  updateServer: (server: Server) => Promise<void>;
  startServer: (serverId: string) => Promise<boolean>;
  stopServer: (serverId: string) => Promise<boolean>;
  restartServer: (serverId: string) => Promise<boolean>;
  refreshServerStats: (serverId: string) => Promise<void>;

  connectRcon: (serverId: string) => Promise<boolean>;
  disconnectRcon: (serverId: string) => Promise<void>;
  sendCommand: (serverId: string, command: string) => Promise<string>;

  loadPlayers: (serverId: string) => Promise<void>;
  kickPlayer: (serverId: string, steamId: string, reason?: string) => Promise<void>;
  banPlayer: (serverId: string, steamId: string, reason?: string, duration?: number) => Promise<void>;
  unbanPlayer: (serverId: string, steamId: string) => Promise<void>;
  mutePlayer: (serverId: string, steamId: string) => Promise<void>;
  unmutePlayer: (serverId: string, steamId: string) => Promise<void>;
  teleportPlayer: (serverId: string, steamId: string, x: number, y: number, z: number) => Promise<void>;
  giveItem: (serverId: string, steamId: string, item: string, amount: number) => Promise<void>;
  sendMessage: (serverId: string, message: string, steamId?: string) => Promise<void>;

  loadPlugins: (serverId: string) => Promise<void>;
  reloadPlugin: (serverId: string, pluginName: string) => Promise<void>;
  unloadPlugin: (serverId: string, pluginName: string) => Promise<void>;
  loadPlugin: (serverId: string, pluginName: string) => Promise<void>;

  loadWipeSchedules: (serverId: string) => Promise<void>;
  scheduleWipe: (serverId: string, schedule: Partial<WipeSchedule>) => Promise<void>;
  cancelWipe: (scheduleId: string) => Promise<void>;
  wipeNow: (serverId: string, options: { blueprints: boolean; map: boolean; playerData: boolean; newSeed: boolean }) => Promise<void>;

  loadBackups: (serverId: string) => Promise<void>;
  createBackup: (serverId: string, name: string, options: { plugins: boolean; oxideData: boolean; playerData: boolean; map: boolean }) => Promise<void>;
  restoreBackup: (serverId: string, backupId: string) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;

  loadLogs: (serverId?: string) => Promise<void>;
  addLog: (level: string, category: string, message: string, serverId?: string) => Promise<void>;

  loadMaps: (serverId: string) => Promise<void>;
  setMap: (serverId: string, mapName: string, customUrl?: string) => Promise<void>;

  setSidebarOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      rememberMe: false,
      servers: [],
      selectedServer: null,
      serverStats: {},
      rconConnected: {},
      players: [],
      plugins: [],
      consoleMessages: [],
      wipeSchedules: [],
      backups: [],
      logs: [],
      maps: [],
      userPermissions: [],
      sidebarOpen: true,
      loading: false,
      error: null,

      // Auth actions
      login: async (username, password, rememberMe) => {
        set({ loading: true, error: null });
        try {
          const response = await invoke<LoginResponse>('login', {
            username,
            password,
            rememberMe,
          });
          if (response.success && response.user) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              rememberMe,
              loading: false,
            });
          } else {
            set({ error: response.message, loading: false });
          }
          return response;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          set({ error: message, loading: false });
          return { success: false, user: null, message, token: null };
        }
      },

      register: async (username, email, password) => {
        set({ loading: true, error: null });
        try {
          const response = await invoke<LoginResponse>('register', {
            username,
            email,
            password,
          });
          if (response.success && response.user) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              loading: false,
            });
          } else {
            set({ error: response.message, loading: false });
          }
          return response;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          set({ error: message, loading: false });
          return { success: false, user: null, message, token: null };
        }
      },

      logout: async () => {
        try {
          await invoke('logout');
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          servers: [],
          selectedServer: null,
          serverStats: {},
          rconConnected: {},
          players: [],
          plugins: [],
          consoleMessages: [],
        });
      },

      resetPassword: async (email, newPassword) => {
        try {
          return await invoke<boolean>('reset_password', { email, newPassword });
        } catch (error) {
          set({ error: String(error) });
          return false;
        }
      },

      // Server actions
      loadServers: async () => {
        const { user } = get();
        if (!user) return;

        set({ loading: true });
        try {
          const servers = await invoke<Server[]>('get_servers', { ownerId: user.id });
          set({ servers, loading: false });
        } catch (error) {
          set({ error: String(error), loading: false });
        }
      },

      selectServer: (server) => {
        set({ selectedServer: server });
      },

      addServer: async (request) => {
        const { user } = get();
        if (!user) throw new Error('Not authenticated');

        try {
          const server = await invoke<Server>('add_server', { request, ownerId: user.id });
          set((state) => ({ servers: [...state.servers, server] }));
          return server;
        } catch (error) {
          set({ error: String(error) });
          throw error;
        }
      },

      removeServer: async (serverId) => {
        try {
          await invoke('remove_server', { serverId });
          set((state) => ({
            servers: state.servers.filter((s) => s.id !== serverId),
            selectedServer: state.selectedServer?.id === serverId ? null : state.selectedServer,
          }));
        } catch (error) {
          set({ error: String(error) });
        }
      },

      updateServer: async (server) => {
        try {
          await invoke('update_server', { server });
          set((state) => ({
            servers: state.servers.map((s) => (s.id === server.id ? server : s)),
            selectedServer: state.selectedServer?.id === server.id ? server : state.selectedServer,
          }));
        } catch (error) {
          set({ error: String(error) });
        }
      },

      startServer: async (serverId) => {
        try {
          const result = await invoke<boolean>('start_server', { serverId });
          await get().loadServers();
          return result;
        } catch (error) {
          set({ error: String(error) });
          return false;
        }
      },

      stopServer: async (serverId) => {
        try {
          const result = await invoke<boolean>('stop_server', { serverId });
          await get().loadServers();
          return result;
        } catch (error) {
          set({ error: String(error) });
          return false;
        }
      },

      restartServer: async (serverId) => {
        try {
          const result = await invoke<boolean>('restart_server', { serverId });
          await get().loadServers();
          return result;
        } catch (error) {
          set({ error: String(error) });
          return false;
        }
      },

      refreshServerStats: async (serverId) => {
        try {
          const stats = await invoke<ServerStats>('get_server_stats', { serverId });
          set((state) => ({
            serverStats: { ...state.serverStats, [serverId]: stats },
          }));
        } catch (error) {
          console.error('Failed to get server stats:', error);
        }
      },

      // RCON actions
      connectRcon: async (serverId) => {
        const { servers } = get();
        const server = servers.find((s) => s.id === serverId);
        if (!server) return false;

        try {
          const connected = await invoke<boolean>('connect_rcon', {
            serverId,
            ip: server.ip,
            port: server.rcon_port,
            password: server.rcon_password,
          });
          set((state) => ({
            rconConnected: { ...state.rconConnected, [serverId]: connected },
          }));
          return connected;
        } catch (error) {
          set({ error: String(error) });
          return false;
        }
      },

      disconnectRcon: async (serverId) => {
        try {
          await invoke('disconnect_rcon', { serverId });
          set((state) => ({
            rconConnected: { ...state.rconConnected, [serverId]: false },
          }));
        } catch (error) {
          set({ error: String(error) });
        }
      },

      sendCommand: async (serverId, command) => {
        try {
          const response = await invoke<string>('send_command', { serverId, command });
          set((state) => ({
            consoleMessages: [
              ...state.consoleMessages,
              {
                timestamp: new Date().toISOString(),
                message: `> ${command}`,
                message_type: 'command',
              },
              {
                timestamp: new Date().toISOString(),
                message: response,
                message_type: 'response',
              },
            ],
          }));
          return response;
        } catch (error) {
          const errorMsg = String(error);
          set((state) => ({
            consoleMessages: [
              ...state.consoleMessages,
              {
                timestamp: new Date().toISOString(),
                message: errorMsg,
                message_type: 'error',
              },
            ],
          }));
          throw error;
        }
      },

      // Player actions
      loadPlayers: async (serverId) => {
        try {
          const players = await invoke<Player[]>('get_players', { serverId });
          set({ players });
        } catch (error) {
          set({ players: [] });
        }
      },

      kickPlayer: async (serverId, steamId, reason) => {
        await invoke('kick_player', { serverId, steamId, reason });
        await get().loadPlayers(serverId);
      },

      banPlayer: async (serverId, steamId, reason, duration) => {
        await invoke('ban_player', { serverId, steamId, reason, duration });
        await get().loadPlayers(serverId);
      },

      unbanPlayer: async (serverId, steamId) => {
        await invoke('unban_player', { serverId, steamId });
      },

      mutePlayer: async (serverId, steamId) => {
        await invoke('mute_player', { serverId, steamId });
        await get().loadPlayers(serverId);
      },

      unmutePlayer: async (serverId, steamId) => {
        await invoke('unmute_player', { serverId, steamId });
        await get().loadPlayers(serverId);
      },

      teleportPlayer: async (serverId, steamId, x, y, z) => {
        await invoke('teleport_player', { serverId, steamId, x, y, z });
      },

      giveItem: async (serverId, steamId, itemName, amount) => {
        await invoke('give_item', { serverId, steamId, itemName, amount });
      },

      sendMessage: async (serverId, message, steamId) => {
        await invoke('send_message', { serverId, message, steamId });
      },

      // Plugin actions
      loadPlugins: async (serverId) => {
        try {
          const plugins = await invoke<Plugin[]>('get_installed_plugins', { serverId });
          set({ plugins });
        } catch (error) {
          set({ plugins: [] });
        }
      },

      reloadPlugin: async (serverId, pluginName) => {
        await invoke('reload_plugin', { serverId, pluginName });
        await get().loadPlugins(serverId);
      },

      unloadPlugin: async (serverId, pluginName) => {
        await invoke('unload_plugin', { serverId, pluginName });
        await get().loadPlugins(serverId);
      },

      loadPlugin: async (serverId, pluginName) => {
        await invoke('load_plugin', { serverId, pluginName });
        await get().loadPlugins(serverId);
      },

      // Wipe actions
      loadWipeSchedules: async (serverId) => {
        try {
          const wipeSchedules = await invoke<WipeSchedule[]>('get_scheduled_wipes', { serverId });
          set({ wipeSchedules });
        } catch (error) {
          set({ wipeSchedules: [] });
        }
      },

      scheduleWipe: async (serverId, schedule) => {
        await invoke('schedule_wipe', {
          serverId,
          name: schedule.name || 'Scheduled Wipe',
          cronExpression: schedule.cron_expression || '0 0 * * 4',
          wipeBlueprints: schedule.wipe_blueprints || false,
          wipeMap: schedule.wipe_map !== false,
          wipePlayerData: schedule.wipe_player_data || false,
          newSeed: schedule.new_seed !== false,
          customSeed: schedule.custom_seed,
          preWipeMessage: schedule.pre_wipe_message,
          countdownMinutes: schedule.countdown_minutes || 5,
        });
        await get().loadWipeSchedules(serverId);
      },

      cancelWipe: async (scheduleId) => {
        await invoke('cancel_wipe', { scheduleId });
        const { selectedServer } = get();
        if (selectedServer) {
          await get().loadWipeSchedules(selectedServer.id);
        }
      },

      wipeNow: async (serverId, options) => {
        await invoke('wipe_now', {
          serverId,
          wipeBlueprints: options.blueprints,
          wipeMap: options.map,
          wipePlayerData: options.playerData,
          newSeed: options.newSeed,
          customSeed: null,
        });
      },

      // Backup actions
      loadBackups: async (serverId) => {
        try {
          const backups = await invoke<Backup[]>('get_backups', { serverId });
          set({ backups });
        } catch (error) {
          set({ backups: [] });
        }
      },

      createBackup: async (serverId, name, options) => {
        await invoke('create_backup', {
          serverId,
          name,
          includePlugins: options.plugins,
          includeOxideData: options.oxideData,
          includePlayerData: options.playerData,
          includeMap: options.map,
          backupType: 'manual',
        });
        await get().loadBackups(serverId);
      },

      restoreBackup: async (serverId, backupId) => {
        await invoke('restore_backup', { serverId, backupId });
      },

      deleteBackup: async (backupId) => {
        await invoke('delete_backup', { backupId, deleteFile: true });
        const { selectedServer } = get();
        if (selectedServer) {
          await get().loadBackups(selectedServer.id);
        }
      },

      // Log actions
      loadLogs: async (serverId) => {
        try {
          const logs = await invoke<LogEntry[]>('get_logs', { serverId, limit: 500 });
          set({ logs });
        } catch (error) {
          set({ logs: [] });
        }
      },

      addLog: async (level, category, message, serverId) => {
        const { user } = get();
        await invoke('add_log', {
          level,
          category,
          message,
          serverId,
          userId: user?.id,
          details: null,
        });
      },

      // Map actions
      loadMaps: async (serverId) => {
        try {
          const maps = await invoke<RustMap[]>('get_maps', { serverId });
          set({ maps });
        } catch (error) {
          set({ maps: [] });
        }
      },

      setMap: async (serverId, mapName, customUrl) => {
        await invoke('set_map', { serverId, mapName, customUrl });
        await get().loadServers();
      },

      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'rust-server-manager-storage',
      partialize: (state) => ({
        user: state.rememberMe ? state.user : null,
        token: state.rememberMe ? state.token : null,
        isAuthenticated: state.rememberMe ? state.isAuthenticated : false,
        rememberMe: state.rememberMe,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

export default useStore;
