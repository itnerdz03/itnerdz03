import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Alert,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  PlayArrow as LoadIcon,
  Stop as UnloadIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { useStore } from '../store';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';

const PluginsPage: React.FC = () => {
  const {
    selectedServer,
    servers,
    selectServer,
    plugins,
    loadPlugins,
    reloadPlugin,
    unloadPlugin,
    loadPlugin,
  } = useStore();

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [oxideDialogOpen, setOxideDialogOpen] = useState(false);
  const [oxideVersion, setOxideVersion] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (selectedServer) {
      loadPlugins(selectedServer.id);
      checkOxideVersion();
    }
  }, [selectedServer]);

  const checkOxideVersion = async () => {
    if (!selectedServer) return;
    try {
      const version = await invoke<string>('get_oxide_version', { serverId: selectedServer.id });
      setOxideVersion(version);
    } catch {
      setOxideVersion('Unknown');
    }
  };

  const handleInstallPlugin = async () => {
    if (!selectedServer) return;

    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'C# Plugin', extensions: ['cs'] }],
      });

      if (selected && typeof selected === 'string') {
        await invoke('install_plugin', { serverId: selectedServer.id, pluginPath: selected });
        setMessage({ type: 'success', text: 'Plugin installed successfully' });
        await loadPlugins(selectedServer.id);
      }
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleReloadPlugin = async (pluginName: string) => {
    if (!selectedServer) return;
    setLoading(pluginName);
    try {
      await reloadPlugin(selectedServer.id, pluginName);
      setMessage({ type: 'success', text: `Plugin ${pluginName} reloaded` });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
    setLoading(null);
  };

  const handleUnloadPlugin = async (pluginName: string) => {
    if (!selectedServer) return;
    setLoading(pluginName);
    try {
      await unloadPlugin(selectedServer.id, pluginName);
      setMessage({ type: 'success', text: `Plugin ${pluginName} unloaded` });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
    setLoading(null);
  };

  const handleLoadPlugin = async (pluginName: string) => {
    if (!selectedServer) return;
    setLoading(pluginName);
    try {
      await loadPlugin(selectedServer.id, pluginName);
      setMessage({ type: 'success', text: `Plugin ${pluginName} loaded` });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
    setLoading(null);
  };

  const handleInstallOxide = async () => {
    if (!selectedServer) return;
    try {
      const scriptPath = await invoke<string>('install_oxide', {
        serverId: selectedServer.id,
        version: null,
      });
      setMessage({ type: 'success', text: `Oxide installation script created at: ${scriptPath}` });
      setOxideDialogOpen(false);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleUpdateOxide = async () => {
    if (!selectedServer) return;
    try {
      const scriptPath = await invoke<string>('update_oxide', { serverId: selectedServer.id });
      setMessage({ type: 'success', text: `Oxide update script created at: ${scriptPath}` });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const filteredPlugins = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedServer) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Plugins
        </Typography>
        <Card>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>Select Server</InputLabel>
              <Select
                value=""
                label="Select Server"
                onChange={(e) => {
                  const server = servers.find((s) => s.id === e.target.value);
                  if (server) selectServer(server);
                }}
              >
                {servers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Plugins
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedServer.name} - {plugins.length} plugins installed
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={selectedServer.id}
              onChange={(e) => {
                const server = servers.find((s) => s.id === e.target.value);
                if (server) selectServer(server);
              }}
            >
              {servers.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={() => loadPlugins(selectedServer.id)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Oxide Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">Oxide/uMod</Typography>
              <Typography variant="body2" color="text.secondary">
                {oxideVersion}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => setOxideDialogOpen(true)}
              >
                Install Oxide
              </Button>
              <Button
                variant="outlined"
                startIcon={<UpdateIcon />}
                onClick={handleUpdateOxide}
              >
                Update Oxide
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Search and Upload */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Search plugins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={handleInstallPlugin}
              sx={{
                background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
                minWidth: 160,
              }}
            >
              Install Plugin
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Plugin Grid */}
      <Grid container spacing={2}>
        {filteredPlugins.map((plugin) => (
          <Grid item xs={12} sm={6} md={4} key={plugin.name}>
            <Card className="plugin-card" sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {plugin.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={plugin.is_loaded ? 'LOADED' : 'UNLOADED'}
                    color={plugin.is_loaded ? 'success' : 'default'}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  by {plugin.author}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Version: {plugin.version}
                </Typography>
                {plugin.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {plugin.description.length > 100
                      ? `${plugin.description.substring(0, 100)}...`
                      : plugin.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {plugin.is_loaded ? (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={loading === plugin.name ? <CircularProgress size={16} /> : <RefreshIcon />}
                        onClick={() => handleReloadPlugin(plugin.name)}
                        disabled={loading === plugin.name}
                      >
                        Reload
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<UnloadIcon />}
                        onClick={() => handleUnloadPlugin(plugin.name)}
                        disabled={loading === plugin.name}
                      >
                        Unload
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<LoadIcon />}
                      onClick={() => handleLoadPlugin(plugin.name)}
                      disabled={loading === plugin.name}
                    >
                      Load
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {filteredPlugins.length === 0 && (
          <Grid item xs={12}>
            <Card sx={{ textAlign: 'center', py: 6 }}>
              <CardContent>
                <Typography color="text.secondary">
                  {plugins.length === 0
                    ? 'No plugins installed. Install Oxide and add plugins to get started.'
                    : 'No plugins match your search'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Install Oxide Dialog */}
      <Dialog open={oxideDialogOpen} onClose={() => setOxideDialogOpen(false)}>
        <DialogTitle>Install Oxide/uMod</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will create a script to download and install Oxide for your Rust server.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Installation path: {selectedServer.install_path}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOxideDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInstallOxide}>
            Create Install Script
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PluginsPage;
