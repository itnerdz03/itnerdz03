import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  LinearProgress,
  Tooltip,
  Button,
  Skeleton,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  People as PlayersIcon,
  Speed as FpsIcon,
  Memory as MemoryIcon,
  Timer as UptimeIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { TIER_MAX_SERVERS, TIER_FEATURES } from '../types';

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
};

const ServerCard: React.FC<{
  serverId: string;
  onSelect: () => void;
}> = ({ serverId, onSelect }) => {
  const navigate = useNavigate();
  const {
    servers,
    serverStats,
    startServer,
    stopServer,
    restartServer,
    refreshServerStats,
    selectServer,
    connectRcon,
    rconConnected,
  } = useStore();

  const server = servers.find((s) => s.id === serverId);
  const stats = serverStats[serverId];
  const isConnected = rconConnected[serverId];

  useEffect(() => {
    if (server && server.status === 'online') {
      connectRcon(serverId).then(() => {
        refreshServerStats(serverId);
      });
      const interval = setInterval(() => {
        refreshServerStats(serverId);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [serverId, server?.status]);

  if (!server) return null;

  const isOnline = server.status === 'online';
  const isLoading = ['starting', 'stopping', 'restarting', 'updating'].includes(server.status);

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await startServer(serverId);
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await stopServer(serverId);
  };

  const handleRestart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await restartServer(serverId);
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectServer(server);
    navigate(`/servers/${serverId}`);
  };

  return (
    <Card
      className="server-card"
      onClick={onSelect}
      sx={{
        cursor: 'pointer',
        bgcolor: '#252525',
        border: '1px solid',
        borderColor: isOnline ? 'success.main' : '#333',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {isLoading && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            borderRadius: '12px 12px 0 0',
          }}
        />
      )}
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {server.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {server.ip}:{server.port}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              size="small"
              label={server.status.toUpperCase()}
              color={isOnline ? 'success' : isLoading ? 'warning' : 'error'}
            />
            {server.oxide_enabled && (
              <Chip size="small" label="OXIDE" sx={{ bgcolor: '#9c27b0' }} />
            )}
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlayersIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2">
                {stats?.players_online ?? 0} / {server.max_players}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FpsIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2">
                {stats?.fps?.toFixed(0) ?? 0} FPS
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MemoryIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2">
                {formatBytes(stats?.ram_usage_mb ?? 0)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UptimeIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2">
                {formatUptime(stats?.uptime_seconds ?? 0)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {isOnline ? (
              <>
                <Tooltip title="Stop Server">
                  <IconButton
                    size="small"
                    onClick={handleStop}
                    disabled={isLoading}
                    sx={{ color: 'error.main' }}
                  >
                    <StopIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Restart Server">
                  <IconButton
                    size="small"
                    onClick={handleRestart}
                    disabled={isLoading}
                    sx={{ color: 'warning.main' }}
                  >
                    <RestartIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Tooltip title="Start Server">
                <IconButton
                  size="small"
                  onClick={handleStart}
                  disabled={isLoading}
                  sx={{ color: 'success.main' }}
                >
                  <StartIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Tooltip title="Server Settings">
            <IconButton size="small" onClick={handleSettings}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, servers, loadServers, selectServer, loading } = useStore();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadServers().then(() => setInitialLoad(false));
  }, []);

  const maxServers = TIER_MAX_SERVERS[user?.tier || 'free'];
  const canAddServer = servers.length < maxServers;

  const handleAddServer = () => {
    navigate('/servers?new=true');
  };

  const handleSelectServer = (server: any) => {
    selectServer(server);
    navigate(`/servers/${server.id}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back, {user?.username}!
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip
            label={`${servers.length} / ${maxServers} Servers`}
            color={servers.length >= maxServers ? 'warning' : 'default'}
          />
          {canAddServer && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddServer}
              sx={{
                background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
              }}
            >
              Add Server
            </Button>
          )}
        </Box>
      </Box>

      {/* Tier info */}
      <Card sx={{ mb: 3, bgcolor: '#252525', border: '1px solid #333' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {user?.tier.toUpperCase()} Plan
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {TIER_FEATURES[user?.tier || 'free'].join(' • ')}
              </Typography>
            </Box>
            {user?.tier !== 'admin' && user?.tier !== 'enterprise' && (
              <Button variant="outlined" color="primary">
                Upgrade Plan
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Server cards */}
      {initialLoad ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} lg={4} key={i}>
              <Card sx={{ bgcolor: '#252525', border: '1px solid #333' }}>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="40%" height={20} />
                  <Box sx={{ mt: 2 }}>
                    <Skeleton variant="rectangular" height={60} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : servers.length === 0 ? (
        <Card sx={{ bgcolor: '#252525', border: '1px solid #333', textAlign: 'center', py: 6 }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No servers yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your first Rust server to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddServer}
              sx={{
                background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
              }}
            >
              Add Your First Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {servers.map((server) => (
            <Grid item xs={12} sm={6} lg={4} key={server.id}>
              <ServerCard
                serverId={server.id}
                onSelect={() => handleSelectServer(server)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default DashboardPage;
