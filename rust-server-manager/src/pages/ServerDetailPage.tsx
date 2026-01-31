import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  IconButton,
  Chip,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Build as InstallIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { invoke } from '@tauri-apps/api/tauri';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const ServerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    servers,
    selectedServer,
    selectServer,
    updateServer,
    removeServer,
    startServer,
    stopServer,
    restartServer,
    serverStats,
    refreshServerStats,
    connectRcon,
  } = useStore();

  const [tab, setTab] = useState(0);
  const [editedServer, setEditedServer] = useState(selectedServer);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (id) {
      const server = servers.find((s) => s.id === id);
      if (server) {
        selectServer(server);
        setEditedServer(server);
        if (server.status === 'online') {
          connectRcon(server.id).then(() => {
            refreshServerStats(server.id);
          });
        }
      }
    }
  }, [id, servers]);

  if (!selectedServer || !editedServer) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          Server not found
        </Typography>
        <Button onClick={() => navigate('/servers')} sx={{ mt: 2 }}>
          Back to Servers
        </Button>
      </Box>
    );
  }

  const stats = serverStats[selectedServer.id];
  const isOnline = selectedServer.status === 'online';
  const isLoading = ['starting', 'stopping', 'restarting', 'updating'].includes(selectedServer.status);

  const handleSave = async () => {
    try {
      await updateServer(editedServer);
      setMessage({ type: 'success', text: 'Server settings saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleDelete = async () => {
    try {
      await removeServer(selectedServer.id);
      navigate('/servers');
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleInstall = async () => {
    try {
      const scriptPath = await invoke<string>('install_rust_server', {
        serverId: selectedServer.id,
        installPath: selectedServer.install_path,
        betaBranch: null,
      });
      setMessage({ type: 'success', text: `Installation script created at: ${scriptPath}` });
      setInstallDialogOpen(false);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleUpdate = async () => {
    try {
      const scriptPath = await invoke<string>('update_rust_server', {
        serverId: selectedServer.id,
        sendWarning: false,
        warningMessage: null,
      });
      setMessage({ type: 'success', text: `Update script created at: ${scriptPath}` });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleGenerateScript = async () => {
    try {
      const script = await invoke<string>('generate_startup_script', {
        serverId: selectedServer.id,
        customArgs: null,
      });
      setEditedServer({ ...editedServer, startup_script: script });
      setMessage({ type: 'success', text: 'Startup script generated!' });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/servers')}>
          <BackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={600}>
            {selectedServer.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedServer.ip}:{selectedServer.port}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={selectedServer.status.toUpperCase()}
            color={isOnline ? 'success' : isLoading ? 'warning' : 'error'}
          />
          {isOnline ? (
            <>
              <Tooltip title="Stop">
                <IconButton
                  onClick={() => stopServer(selectedServer.id)}
                  disabled={isLoading}
                  color="error"
                >
                  <StopIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Restart">
                <IconButton
                  onClick={() => restartServer(selectedServer.id)}
                  disabled={isLoading}
                  color="warning"
                >
                  <RestartIcon />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Start">
              <IconButton
                onClick={() => startServer(selectedServer.id)}
                disabled={isLoading}
                color="success"
              >
                <StartIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Players</Typography>
              <Typography variant="h5">
                {stats?.players_online ?? 0} / {selectedServer.max_players}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">FPS</Typography>
              <Typography variant="h5">{stats?.fps?.toFixed(0) ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">RAM</Typography>
              <Typography variant="h5">{stats?.ram_usage_mb ?? 0} MB</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Entities</Typography>
              <Typography variant="h5">{stats?.entities ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Configuration" />
          <Tab label="Network" />
          <Tab label="Startup Script" />
          <Tab label="Installation" />
        </Tabs>

        <CardContent>
          <TabPanel value={tab} index={0}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Server Name"
                  value={editedServer.name}
                  onChange={(e) => setEditedServer({ ...editedServer, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Identity"
                  value={editedServer.identity}
                  onChange={(e) => setEditedServer({ ...editedServer, identity: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={editedServer.description}
                  onChange={(e) => setEditedServer({ ...editedServer, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Max Players"
                  type="number"
                  value={editedServer.max_players}
                  onChange={(e) => setEditedServer({ ...editedServer, max_players: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="World Size"
                  type="number"
                  value={editedServer.world_size}
                  onChange={(e) => setEditedServer({ ...editedServer, world_size: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Seed"
                  type="number"
                  value={editedServer.seed}
                  onChange={(e) => setEditedServer({ ...editedServer, seed: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Tickrate"
                  type="number"
                  value={editedServer.tickrate}
                  onChange={(e) => setEditedServer({ ...editedServer, tickrate: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Map Name"
                  value={editedServer.map_name}
                  onChange={(e) => setEditedServer({ ...editedServer, map_name: e.target.value })}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="IP Address"
                  value={editedServer.ip}
                  onChange={(e) => setEditedServer({ ...editedServer, ip: e.target.value })}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Server Port"
                  type="number"
                  value={editedServer.port}
                  onChange={(e) => setEditedServer({ ...editedServer, port: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="RCON Port"
                  type="number"
                  value={editedServer.rcon_port}
                  onChange={(e) => setEditedServer({ ...editedServer, rcon_port: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="RCON Password"
                  type="password"
                  value={editedServer.rcon_password}
                  onChange={(e) => setEditedServer({ ...editedServer, rcon_password: e.target.value })}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Query Port"
                  type="number"
                  value={editedServer.query_port}
                  onChange={(e) => setEditedServer({ ...editedServer, query_port: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="App Port"
                  type="number"
                  value={editedServer.app_port}
                  onChange={(e) => setEditedServer({ ...editedServer, app_port: parseInt(e.target.value) })}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Box sx={{ mb: 2 }}>
              <Button variant="outlined" onClick={handleGenerateScript}>
                Generate Default Script
              </Button>
            </Box>
            <TextField
              fullWidth
              label="Startup Script"
              value={editedServer.startup_script || ''}
              onChange={(e) => setEditedServer({ ...editedServer, startup_script: e.target.value })}
              multiline
              rows={15}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: 12,
                },
              }}
            />
          </TabPanel>

          <TabPanel value={tab} index={3}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Installation Path"
                  value={editedServer.install_path}
                  onChange={(e) => setEditedServer({ ...editedServer, install_path: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<InstallIcon />}
                    onClick={() => setInstallDialogOpen(true)}
                  >
                    Install/Verify Server
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<UpdateIcon />}
                    onClick={handleUpdate}
                  >
                    Update Server
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete Server
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          sx={{
            background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
          }}
        >
          Save Changes
        </Button>
      </Box>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Server</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedServer.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Install Dialog */}
      <Dialog open={installDialogOpen} onClose={() => setInstallDialogOpen(false)}>
        <DialogTitle>Install Rust Server</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will create an installation script using SteamCMD at:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: '#1a1a1a', p: 1, borderRadius: 1 }}>
            {selectedServer.install_path}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInstall}>Create Script</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServerDetailPage;
