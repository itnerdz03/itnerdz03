import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
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
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Check as SelectIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import { useStore } from '../store';
import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';

const MapsPage: React.FC = () => {
  const {
    selectedServer,
    servers,
    selectServer,
    maps,
    loadMaps,
    setMap,
  } = useStore();

  const [customMapDialogOpen, setCustomMapDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [customMapUrl, setCustomMapUrl] = useState('');
  const [customMapFile, setCustomMapFile] = useState('');
  const [customMapName, setCustomMapName] = useState('');

  useEffect(() => {
    if (selectedServer) {
      loadMaps(selectedServer.id);
    }
  }, [selectedServer]);

  const handleSetMap = async (mapName: string, customUrl?: string) => {
    if (!selectedServer) return;
    try {
      await setMap(selectedServer.id, mapName, customUrl);
      setMessage({ type: 'success', text: `Map changed to ${mapName}. Restart server to apply.` });
      setCustomMapDialogOpen(false);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleUploadMap = async () => {
    if (!selectedServer) return;

    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Rust Map', extensions: ['map'] }],
      });

      if (selected && typeof selected === 'string') {
        setCustomMapFile(selected);
        const filename = selected.split(/[/\\]/).pop()?.replace('.map', '') || 'custom_map';
        setCustomMapName(filename);
        setCustomMapDialogOpen(true);
      }
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedServer || !customMapFile || !customMapName) return;
    try {
      await invoke('upload_custom_map', {
        serverId: selectedServer.id,
        mapPath: customMapFile,
        mapName: customMapName,
      });
      await handleSetMap(customMapName);
      setMessage({ type: 'success', text: 'Custom map uploaded successfully!' });
      await loadMaps(selectedServer.id);
      setCustomMapDialogOpen(false);
      setCustomMapFile('');
      setCustomMapName('');
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleDeleteMap = async (mapName: string) => {
    if (!selectedServer) return;
    try {
      await invoke('delete_map', { serverId: selectedServer.id, mapName });
      setMessage({ type: 'success', text: 'Map deleted' });
      await loadMaps(selectedServer.id);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const formatSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (!selectedServer) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Maps
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
            Maps
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedServer.name} - Current: {selectedServer.map_name}
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
            <IconButton onClick={() => loadMaps(selectedServer.id)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUploadMap}
            sx={{
              background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
            }}
          >
            Upload Map
          </Button>
        </Box>
      </Box>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Custom Map URL */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Load from URL
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Enter RustMaps.com or custom map URL..."
              value={customMapUrl}
              onChange={(e) => setCustomMapUrl(e.target.value)}
            />
            <Button
              variant="outlined"
              onClick={() => handleSetMap('Custom Map', customMapUrl)}
              disabled={!customMapUrl}
            >
              Apply
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Map Grid */}
      <Grid container spacing={3}>
        {maps.map((map) => (
          <Grid item xs={12} sm={6} md={4} key={map.name}>
            <Card
              sx={{
                height: '100%',
                border: selectedServer.map_name === map.name ? '2px solid' : '1px solid',
                borderColor: selectedServer.map_name === map.name ? 'primary.main' : '#333',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MapIcon sx={{ color: 'text.secondary' }} />
                    <Typography variant="h6" fontWeight={600}>
                      {map.name}
                    </Typography>
                  </Box>
                  {map.is_custom && (
                    <Chip size="small" label="CUSTOM" color="primary" />
                  )}
                  {selectedServer.map_name === map.name && (
                    <Chip size="small" label="ACTIVE" color="success" />
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  {map.procedural_size && (
                    <Typography variant="body2" color="text.secondary">
                      Size: {map.procedural_size}
                    </Typography>
                  )}
                  {map.size && (
                    <Typography variant="body2" color="text.secondary">
                      File size: {formatSize(map.size)}
                    </Typography>
                  )}
                  {!map.is_custom && !map.procedural_size && (
                    <Typography variant="body2" color="text.secondary">
                      Static map
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={selectedServer.map_name === map.name ? 'contained' : 'outlined'}
                    startIcon={<SelectIcon />}
                    onClick={() => handleSetMap(map.name)}
                    disabled={selectedServer.map_name === map.name}
                  >
                    Select
                  </Button>
                  {map.is_custom && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteMap(map.name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={customMapDialogOpen} onClose={() => setCustomMapDialogOpen(false)}>
        <DialogTitle>Upload Custom Map</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            File: {customMapFile.split(/[/\\]/).pop()}
          </Typography>
          <TextField
            fullWidth
            label="Map Name"
            value={customMapName}
            onChange={(e) => setCustomMapName(e.target.value)}
            helperText="This name will be used to identify the map"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomMapDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmUpload}>
            Upload & Select
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MapsPage;
