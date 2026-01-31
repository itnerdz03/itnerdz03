import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  VolumeOff as MuteIcon,
  Block as BanIcon,
  ExitToApp as KickIcon,
  Send as MessageIcon,
  CardGiftcard as GiveIcon,
  MyLocation as TeleportIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useStore } from '../store';

const PlayersPage: React.FC = () => {
  const {
    selectedServer,
    servers,
    selectServer,
    players,
    loadPlayers,
    kickPlayer,
    banPlayer,
    mutePlayer,
    unmutePlayer,
    giveItem,
    teleportPlayer,
    sendMessage,
  } = useStore();

  const [search, setSearch] = useState('');
  const [actionDialog, setActionDialog] = useState<{
    type: 'kick' | 'ban' | 'mute' | 'give' | 'teleport' | 'message' | null;
    player: any;
  }>({ type: null, player: null });
  const [actionReason, setActionReason] = useState('');
  const [banDuration, setBanDuration] = useState(0);
  const [giveItemName, setGiveItemName] = useState('');
  const [giveAmount, setGiveAmount] = useState(1);
  const [teleportCoords, setTeleportCoords] = useState({ x: 0, y: 0, z: 0 });
  const [chatMessage, setChatMessage] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (selectedServer) {
      loadPlayers(selectedServer.id);
      const interval = setInterval(() => {
        loadPlayers(selectedServer.id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedServer]);

  const filteredPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.steam_id.includes(search)
  );

  const handleAction = async () => {
    if (!selectedServer || !actionDialog.player) return;

    try {
      switch (actionDialog.type) {
        case 'kick':
          await kickPlayer(selectedServer.id, actionDialog.player.steam_id, actionReason || undefined);
          break;
        case 'ban':
          await banPlayer(
            selectedServer.id,
            actionDialog.player.steam_id,
            actionReason || undefined,
            banDuration || undefined
          );
          break;
        case 'mute':
          if (actionDialog.player.is_muted) {
            await unmutePlayer(selectedServer.id, actionDialog.player.steam_id);
          } else {
            await mutePlayer(selectedServer.id, actionDialog.player.steam_id);
          }
          break;
        case 'give':
          await giveItem(selectedServer.id, actionDialog.player.steam_id, giveItemName, giveAmount);
          break;
        case 'teleport':
          await teleportPlayer(
            selectedServer.id,
            actionDialog.player.steam_id,
            teleportCoords.x,
            teleportCoords.y,
            teleportCoords.z
          );
          break;
        case 'message':
          await sendMessage(selectedServer.id, chatMessage, actionDialog.player.steam_id);
          break;
      }
      setMessage({ type: 'success', text: `Action completed successfully` });
      await loadPlayers(selectedServer.id);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }

    setActionDialog({ type: null, player: null });
    resetDialogFields();
  };

  const resetDialogFields = () => {
    setActionReason('');
    setBanDuration(0);
    setGiveItemName('');
    setGiveAmount(1);
    setTeleportCoords({ x: 0, y: 0, z: 0 });
    setChatMessage('');
  };

  const formatConnectedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!selectedServer) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Players
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
            Players
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedServer.name} - {players.length} online
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
            <IconButton onClick={() => loadPlayers(selectedServer.id)}>
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

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by name or Steam ID..."
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
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Steam ID</TableCell>
              <TableCell>Ping</TableCell>
              <TableCell>Connected</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlayers.map((player) => (
              <TableRow key={player.steam_id} className="player-row">
                <TableCell>{player.name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {player.steam_id}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={`${player.ping}ms`}
                    color={player.ping < 50 ? 'success' : player.ping < 100 ? 'warning' : 'error'}
                  />
                </TableCell>
                <TableCell>{formatConnectedTime(player.connected_seconds)}</TableCell>
                <TableCell>
                  {player.is_muted && <Chip size="small" label="MUTED" color="warning" />}
                  {player.is_admin && <Chip size="small" label="ADMIN" color="primary" />}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Send Message">
                    <IconButton
                      size="small"
                      onClick={() => setActionDialog({ type: 'message', player })}
                    >
                      <MessageIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Give Item">
                    <IconButton
                      size="small"
                      onClick={() => setActionDialog({ type: 'give', player })}
                    >
                      <GiveIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Teleport">
                    <IconButton
                      size="small"
                      onClick={() => setActionDialog({ type: 'teleport', player })}
                    >
                      <TeleportIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={player.is_muted ? 'Unmute' : 'Mute'}>
                    <IconButton
                      size="small"
                      onClick={() => setActionDialog({ type: 'mute', player })}
                      color={player.is_muted ? 'warning' : 'default'}
                    >
                      <MuteIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Kick">
                    <IconButton
                      size="small"
                      onClick={() => setActionDialog({ type: 'kick', player })}
                      color="warning"
                    >
                      <KickIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ban">
                    <IconButton
                      size="small"
                      onClick={() => setActionDialog({ type: 'ban', player })}
                      color="error"
                    >
                      <BanIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredPlayers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    {players.length === 0 ? 'No players online' : 'No players match your search'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Dialog */}
      <Dialog
        open={!!actionDialog.type}
        onClose={() => { setActionDialog({ type: null, player: null }); resetDialogFields(); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.type === 'kick' && 'Kick Player'}
          {actionDialog.type === 'ban' && 'Ban Player'}
          {actionDialog.type === 'mute' && (actionDialog.player?.is_muted ? 'Unmute Player' : 'Mute Player')}
          {actionDialog.type === 'give' && 'Give Item'}
          {actionDialog.type === 'teleport' && 'Teleport Player'}
          {actionDialog.type === 'message' && 'Send Message'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Player: <strong>{actionDialog.player?.name}</strong>
          </Typography>

          {(actionDialog.type === 'kick' || actionDialog.type === 'ban') && (
            <TextField
              fullWidth
              label="Reason (optional)"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          {actionDialog.type === 'ban' && (
            <TextField
              fullWidth
              label="Duration (seconds, 0 = permanent)"
              type="number"
              value={banDuration}
              onChange={(e) => setBanDuration(parseInt(e.target.value))}
            />
          )}

          {actionDialog.type === 'give' && (
            <>
              <TextField
                fullWidth
                label="Item Name"
                value={giveItemName}
                onChange={(e) => setGiveItemName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={giveAmount}
                onChange={(e) => setGiveAmount(parseInt(e.target.value))}
              />
            </>
          )}

          {actionDialog.type === 'teleport' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="X"
                type="number"
                value={teleportCoords.x}
                onChange={(e) => setTeleportCoords({ ...teleportCoords, x: parseFloat(e.target.value) })}
              />
              <TextField
                label="Y"
                type="number"
                value={teleportCoords.y}
                onChange={(e) => setTeleportCoords({ ...teleportCoords, y: parseFloat(e.target.value) })}
              />
              <TextField
                label="Z"
                type="number"
                value={teleportCoords.z}
                onChange={(e) => setTeleportCoords({ ...teleportCoords, z: parseFloat(e.target.value) })}
              />
            </Box>
          )}

          {actionDialog.type === 'message' && (
            <TextField
              fullWidth
              label="Message"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              multiline
              rows={3}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActionDialog({ type: null, player: null }); resetDialogFields(); }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAction}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlayersPage;
