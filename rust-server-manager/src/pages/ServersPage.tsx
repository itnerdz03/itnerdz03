import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Slider,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Folder as FolderIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { NewServerRequest, TIER_MAX_SERVERS } from '../types';
import { open } from '@tauri-apps/api/dialog';

const defaultServer: NewServerRequest = {
  name: '',
  description: '',
  ip: '0.0.0.0',
  port: 28015,
  rcon_port: 28016,
  rcon_password: '',
  query_port: 28017,
  app_port: 28082,
  install_path: '',
  identity: 'server1',
  seed: Math.floor(Math.random() * 2147483647),
  world_size: 4000,
  max_players: 100,
  tickrate: 30,
  map_name: 'Procedural Map',
  oxide_enabled: true,
};

const ServersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, servers, loadServers, addServer, selectServer } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newServer, setNewServer] = useState<NewServerRequest>({ ...defaultServer });
  const [error, setError] = useState<string | null>(null);

  const maxServers = TIER_MAX_SERVERS[user?.tier || 'free'];
  const canAddServer = servers.length < maxServers;

  useEffect(() => {
    loadServers();
    if (searchParams.get('new') === 'true') {
      setDialogOpen(true);
      setSearchParams({});
    }
  }, []);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Server Installation Directory',
      });
      if (selected && typeof selected === 'string') {
        setNewServer({ ...newServer, install_path: selected });
      }
    } catch (err) {
      console.error('Failed to open dialog:', err);
    }
  };

  const handleCreateServer = async () => {
    setError(null);

    if (!newServer.name) {
      setError('Server name is required');
      return;
    }
    if (!newServer.install_path) {
      setError('Installation path is required');
      return;
    }
    if (!newServer.rcon_password) {
      setError('RCON password is required');
      return;
    }

    try {
      const server = await addServer(newServer);
      setDialogOpen(false);
      setNewServer({ ...defaultServer, seed: Math.floor(Math.random() * 2147483647) });
      selectServer(server);
      navigate(`/servers/${server.id}`);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleServerClick = (server: any) => {
    selectServer(server);
    navigate(`/servers/${server.id}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Servers
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => loadServers()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {canAddServer && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
              }}
            >
              Add Server
            </Button>
          )}
        </Box>
      </Box>

      {servers.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No servers configured
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add a server to start managing your Rust servers
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
              }}
            >
              Add Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {servers.map((server) => (
            <Grid item xs={12} md={6} lg={4} key={server.id}>
              <Card
                className="server-card"
                onClick={() => handleServerClick(server)}
                sx={{ cursor: 'pointer' }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {server.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={server.status.toUpperCase()}
                      color={server.status === 'online' ? 'success' : 'error'}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {server.ip}:{server.port}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {server.map_name} • {server.world_size} size • {server.max_players} max players
                  </Typography>
                  {server.oxide_enabled && (
                    <Chip size="small" label="OXIDE" sx={{ mt: 1, bgcolor: '#9c27b0' }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Server Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Server</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Server Name"
                value={newServer.name}
                onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newServer.description}
                onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Installation Path"
                value={newServer.install_path}
                onChange={(e) => setNewServer({ ...newServer, install_path: e.target.value })}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSelectFolder}>
                        <FolderIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="IP Address"
                value={newServer.ip}
                onChange={(e) => setNewServer({ ...newServer, ip: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Server Identity"
                value={newServer.identity}
                onChange={(e) => setNewServer({ ...newServer, identity: e.target.value })}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                label="Port"
                type="number"
                value={newServer.port}
                onChange={(e) => setNewServer({ ...newServer, port: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                label="RCON Port"
                type="number"
                value={newServer.rcon_port}
                onChange={(e) => setNewServer({ ...newServer, rcon_port: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                label="Query Port"
                type="number"
                value={newServer.query_port}
                onChange={(e) => setNewServer({ ...newServer, query_port: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                label="App Port"
                type="number"
                value={newServer.app_port}
                onChange={(e) => setNewServer({ ...newServer, app_port: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="RCON Password"
                type="password"
                value={newServer.rcon_password}
                onChange={(e) => setNewServer({ ...newServer, rcon_password: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Map Seed"
                type="number"
                value={newServer.seed}
                onChange={(e) => setNewServer({ ...newServer, seed: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Max Players"
                type="number"
                value={newServer.max_players}
                onChange={(e) => setNewServer({ ...newServer, max_players: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>World Size: {newServer.world_size}</Typography>
              <Slider
                value={newServer.world_size}
                onChange={(_, v) => setNewServer({ ...newServer, world_size: v as number })}
                min={1000}
                max={6000}
                step={500}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newServer.oxide_enabled}
                    onChange={(e) => setNewServer({ ...newServer, oxide_enabled: e.target.checked })}
                  />
                }
                label="Enable Oxide/uMod"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateServer}
            sx={{
              background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
            }}
          >
            Create Server
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServersPage;
