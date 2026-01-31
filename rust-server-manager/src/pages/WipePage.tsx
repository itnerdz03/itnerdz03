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
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  PlayArrow as WipeNowIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useStore } from '../store';

const WipePage: React.FC = () => {
  const {
    selectedServer,
    servers,
    selectServer,
    wipeSchedules,
    loadWipeSchedules,
    scheduleWipe,
    cancelWipe,
    wipeNow,
  } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [wipeNowDialogOpen, setWipeNowDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [scheduleForm, setScheduleForm] = useState({
    name: 'Weekly Wipe',
    cron_expression: '0 0 * * 4',
    wipe_blueprints: false,
    wipe_map: true,
    wipe_player_data: false,
    new_seed: true,
    custom_seed: '',
    pre_wipe_message: 'Server will wipe in {minutes} minutes!',
    countdown_minutes: 5,
  });

  const [wipeNowForm, setWipeNowForm] = useState({
    blueprints: false,
    map: true,
    playerData: false,
    newSeed: true,
  });

  useEffect(() => {
    if (selectedServer) {
      loadWipeSchedules(selectedServer.id);
    }
  }, [selectedServer]);

  const handleScheduleWipe = async () => {
    if (!selectedServer) return;
    try {
      await scheduleWipe(selectedServer.id, {
        ...scheduleForm,
        custom_seed: scheduleForm.custom_seed ? parseInt(scheduleForm.custom_seed) : null,
      });
      setMessage({ type: 'success', text: 'Wipe scheduled successfully!' });
      setDialogOpen(false);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleWipeNow = async () => {
    if (!selectedServer) return;
    try {
      await wipeNow(selectedServer.id, wipeNowForm);
      setMessage({ type: 'success', text: 'Server wiped successfully!' });
      setWipeNowDialogOpen(false);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleCancelWipe = async (scheduleId: string) => {
    try {
      await cancelWipe(scheduleId);
      setMessage({ type: 'success', text: 'Wipe schedule cancelled' });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const cronPresets = [
    { label: 'Weekly (Thursday)', value: '0 0 * * 4' },
    { label: 'Bi-Weekly', value: '0 0 1,15 * *' },
    { label: 'Monthly (First Thursday)', value: '0 0 * * 4#1' },
    { label: 'Daily', value: '0 0 * * *' },
  ];

  if (!selectedServer) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Wipe Manager
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
            Wipe Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedServer.name}
            {selectedServer.last_wipe && (
              <> - Last wiped: {new Date(selectedServer.last_wipe).toLocaleDateString()}</>
            )}
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
            <IconButton onClick={() => loadWipeSchedules(selectedServer.id)}>
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

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Wipe
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Immediately wipe the server with selected options
              </Typography>
              <Button
                variant="contained"
                color="error"
                startIcon={<WipeNowIcon />}
                onClick={() => setWipeNowDialogOpen(true)}
              >
                Wipe Now
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Schedule Wipe
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set up automated wipe schedules
              </Typography>
              <Button
                variant="contained"
                startIcon={<ScheduleIcon />}
                onClick={() => setDialogOpen(true)}
                sx={{
                  background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
                }}
              >
                Create Schedule
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Scheduled Wipes */}
      <Typography variant="h6" gutterBottom>
        Scheduled Wipes
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Options</TableCell>
              <TableCell>Next Run</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wipeSchedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{schedule.name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>
                  {schedule.cron_expression}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {schedule.wipe_map && <Chip size="small" label="Map" />}
                    {schedule.wipe_blueprints && <Chip size="small" label="BPs" color="warning" />}
                    {schedule.wipe_player_data && <Chip size="small" label="Players" color="error" />}
                    {schedule.new_seed && <Chip size="small" label="New Seed" color="info" />}
                  </Box>
                </TableCell>
                <TableCell>
                  {schedule.next_run
                    ? new Date(schedule.next_run).toLocaleString()
                    : 'Not scheduled'}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={schedule.is_active ? 'ACTIVE' : 'PAUSED'}
                    color={schedule.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleCancelWipe(schedule.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {wipeSchedules.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No wipe schedules configured
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Wipe</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Schedule Name"
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Schedule Preset</InputLabel>
                <Select
                  value={scheduleForm.cron_expression}
                  label="Schedule Preset"
                  onChange={(e) => setScheduleForm({ ...scheduleForm, cron_expression: e.target.value })}
                >
                  {cronPresets.map((preset) => (
                    <MenuItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cron Expression"
                value={scheduleForm.cron_expression}
                onChange={(e) => setScheduleForm({ ...scheduleForm, cron_expression: e.target.value })}
                helperText="Custom cron expression (minute hour day month weekday)"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Wipe Options
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={scheduleForm.wipe_map}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, wipe_map: e.target.checked })}
                  />
                }
                label="Wipe Map"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={scheduleForm.wipe_blueprints}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, wipe_blueprints: e.target.checked })}
                  />
                }
                label="Wipe Blueprints"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={scheduleForm.wipe_player_data}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, wipe_player_data: e.target.checked })}
                  />
                }
                label="Wipe Player Data"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={scheduleForm.new_seed}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, new_seed: e.target.checked })}
                  />
                }
                label="Generate New Seed"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Custom Seed (optional)"
                value={scheduleForm.custom_seed}
                onChange={(e) => setScheduleForm({ ...scheduleForm, custom_seed: e.target.value })}
                disabled={!scheduleForm.new_seed}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Countdown Minutes"
                type="number"
                value={scheduleForm.countdown_minutes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, countdown_minutes: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pre-Wipe Message"
                value={scheduleForm.pre_wipe_message}
                onChange={(e) => setScheduleForm({ ...scheduleForm, pre_wipe_message: e.target.value })}
                helperText="Use {minutes} placeholder for countdown"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleScheduleWipe}>
            Create Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Wipe Now Dialog */}
      <Dialog open={wipeNowDialogOpen} onClose={() => setWipeNowDialogOpen(false)}>
        <DialogTitle>Wipe Server Now</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone! Make sure to create a backup first.
          </Alert>
          <FormControlLabel
            control={
              <Checkbox
                checked={wipeNowForm.map}
                onChange={(e) => setWipeNowForm({ ...wipeNowForm, map: e.target.checked })}
              />
            }
            label="Wipe Map"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={wipeNowForm.blueprints}
                onChange={(e) => setWipeNowForm({ ...wipeNowForm, blueprints: e.target.checked })}
              />
            }
            label="Wipe Blueprints"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={wipeNowForm.playerData}
                onChange={(e) => setWipeNowForm({ ...wipeNowForm, playerData: e.target.checked })}
              />
            }
            label="Wipe Player Data"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={wipeNowForm.newSeed}
                onChange={(e) => setWipeNowForm({ ...wipeNowForm, newSeed: e.target.checked })}
              />
            }
            label="Generate New Seed"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWipeNowDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleWipeNow}>
            Wipe Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WipePage;
