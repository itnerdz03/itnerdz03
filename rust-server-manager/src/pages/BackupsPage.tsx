import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControlLabel,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useStore } from '../store';

const BackupsPage: React.FC = () => {
  const {
    selectedServer,
    servers,
    selectServer,
    backups,
    loadBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
  } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [backupForm, setBackupForm] = useState({
    name: '',
    plugins: true,
    oxideData: true,
    playerData: true,
    map: true,
  });

  useEffect(() => {
    if (selectedServer) {
      loadBackups(selectedServer.id);
    }
  }, [selectedServer]);

  const handleCreateBackup = async () => {
    if (!selectedServer || !backupForm.name) return;
    setLoading(true);
    try {
      await createBackup(selectedServer.id, backupForm.name, {
        plugins: backupForm.plugins,
        oxideData: backupForm.oxideData,
        playerData: backupForm.playerData,
        map: backupForm.map,
      });
      setMessage({ type: 'success', text: 'Backup created successfully!' });
      setDialogOpen(false);
      setBackupForm({ name: '', plugins: true, oxideData: true, playerData: true, map: true });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    if (!selectedServer || !selectedBackup) return;
    setLoading(true);
    try {
      await restoreBackup(selectedServer.id, selectedBackup);
      setMessage({ type: 'success', text: 'Backup restored successfully!' });
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
    setLoading(false);
  };

  const handleDelete = async (backupId: string) => {
    try {
      await deleteBackup(backupId);
      setMessage({ type: 'success', text: 'Backup deleted' });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case 'manual':
        return 'default';
      case 'scheduled':
        return 'primary';
      case 'pre_wipe':
        return 'warning';
      case 'pre_update':
        return 'info';
      default:
        return 'default';
    }
  };

  if (!selectedServer) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Backups
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
            Backups
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedServer.name} - {backups.length} backups
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
            <IconButton onClick={() => loadBackups(selectedServer.id)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<BackupIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
            }}
          >
            Create Backup
          </Button>
        </Box>
      </Box>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Backup List */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Contents</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.map((backup) => (
              <TableRow key={backup.id}>
                <TableCell>{backup.name}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={backup.backup_type.toUpperCase().replace('_', ' ')}
                    color={getBackupTypeColor(backup.backup_type) as any}
                  />
                </TableCell>
                <TableCell>{formatSize(backup.size_bytes)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {backup.include_map && <Chip size="small" label="Map" />}
                    {backup.include_plugins && <Chip size="small" label="Plugins" />}
                    {backup.include_oxide_data && <Chip size="small" label="Oxide" />}
                    {backup.include_player_data && <Chip size="small" label="Players" />}
                  </Box>
                </TableCell>
                <TableCell>
                  {new Date(backup.created_at).toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Restore">
                    <IconButton
                      size="small"
                      onClick={() => { setSelectedBackup(backup.id); setRestoreDialogOpen(true); }}
                    >
                      <RestoreIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(backup.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {backups.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No backups found. Create your first backup to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Backup Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Backup</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Backup Name"
                value={backupForm.name}
                onChange={(e) => setBackupForm({ ...backupForm, name: e.target.value })}
                placeholder="e.g., Pre-wipe backup"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Include in Backup
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupForm.map}
                    onChange={(e) => setBackupForm({ ...backupForm, map: e.target.checked })}
                  />
                }
                label="Map Data"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupForm.playerData}
                    onChange={(e) => setBackupForm({ ...backupForm, playerData: e.target.checked })}
                  />
                }
                label="Player Data"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupForm.plugins}
                    onChange={(e) => setBackupForm({ ...backupForm, plugins: e.target.checked })}
                  />
                }
                label="Plugins"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupForm.oxideData}
                    onChange={(e) => setBackupForm({ ...backupForm, oxideData: e.target.checked })}
                  />
                }
                label="Oxide Data & Config"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateBackup}
            disabled={!backupForm.name || loading}
          >
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)}>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will overwrite current server data with the backup contents. Make sure the server is stopped.
          </Alert>
          <Typography>
            Are you sure you want to restore this backup?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRestoreDialogOpen(false); setSelectedBackup(null); }}>
            Cancel
          </Button>
          <Button variant="contained" color="warning" onClick={handleRestore} disabled={loading}>
            Restore Backup
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupsPage;
