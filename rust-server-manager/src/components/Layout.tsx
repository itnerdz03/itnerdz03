import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Storage as ServerIcon,
  People as PlayersIcon,
  Extension as PluginsIcon,
  Terminal as ConsoleIcon,
  DeleteSweep as WipeIcon,
  Backup as BackupIcon,
  Map as MapIcon,
  History as LogsIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useStore } from '../store';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Servers', icon: <ServerIcon />, path: '/servers' },
  { text: 'Players', icon: <PlayersIcon />, path: '/players' },
  { text: 'Plugins', icon: <PluginsIcon />, path: '/plugins' },
  { text: 'Console', icon: <ConsoleIcon />, path: '/console' },
  { text: 'Wipe Manager', icon: <WipeIcon />, path: '/wipe' },
  { text: 'Backups', icon: <BackupIcon />, path: '/backups' },
  { text: 'Maps', icon: <MapIcon />, path: '/maps' },
  { text: 'Logs', icon: <LogsIcon />, path: '/logs' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'free':
      return '#666';
    case 'basic':
      return '#2196f3';
    case 'pro':
      return '#9c27b0';
    case 'enterprise':
      return '#ff9800';
    case 'admin':
      return '#cd2417';
    default:
      return '#666';
  }
};

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, sidebarOpen, setSidebarOpen, error, clearError, selectedServer } = useStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(90deg, #1a1a1a 0%, #252525 100%)',
          borderBottom: '1px solid #333',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="svg"
              viewBox="0 0 100 100"
              sx={{ width: 32, height: 32 }}
            >
              <circle cx="50" cy="50" r="45" stroke="#cd2417" strokeWidth="4" fill="none" />
              <path d="M30 35 L50 25 L70 35 L70 65 L50 75 L30 65 Z" fill="#cd2417" opacity="0.8" />
            </Box>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
              Rust Server Manager
            </Typography>
          </Box>

          {selectedServer && (
            <Chip
              label={selectedServer.name}
              size="small"
              sx={{
                ml: 3,
                bgcolor: selectedServer.status === 'online' ? 'success.main' : 'error.main',
              }}
            />
          )}

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Account">
            <IconButton onClick={handleMenuClick} sx={{ p: 0 }}>
              <Avatar
                sx={{
                  bgcolor: getTierColor(user?.tier || 'free'),
                  width: 36,
                  height: 36,
                }}
              >
                {user?.username.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="subtitle2">{user?.username}</Typography>
                <Chip
                  label={user?.tier.toUpperCase()}
                  size="small"
                  sx={{ bgcolor: getTierColor(user?.tier || 'free'), color: 'white', mt: 0.5 }}
                />
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
            {user?.tier === 'admin' && (
              <MenuItem onClick={() => { handleMenuClose(); navigate('/users'); }}>
                <ListItemIcon><AdminIcon fontSize="small" /></ListItemIcon>
                User Management
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#1e1e1e',
            borderRight: '1px solid #333',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', py: 1 }}>
          <List>
            {menuItems.map((item) => {
              const isSelected = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      mb: 0.5,
                      bgcolor: isSelected ? 'rgba(205, 36, 23, 0.2)' : 'transparent',
                      '&:hover': {
                        bgcolor: isSelected
                          ? 'rgba(205, 36, 23, 0.3)'
                          : 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isSelected ? '#cd2417' : 'text.secondary',
                        minWidth: 40,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        '& .MuiTypography-root': {
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? '#cd2417' : 'text.primary',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          overflow: 'auto',
          bgcolor: '#1a1a1a',
          transition: 'margin 0.2s',
          ml: sidebarOpen ? 0 : `-${drawerWidth}px`,
        }}
      >
        <Outlet />
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={clearError} severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;
