import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Lock as PasswordIcon,
} from '@mui/icons-material';
import { useStore } from '../store';
import { TIER_FEATURES } from '../types';
import { invoke } from '@tauri-apps/api/tauri';

const SettingsPage: React.FC = () => {
  const { user } = useStore();

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await invoke('update_user', {
        userId: user.id,
        username,
        email,
        password: null,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    try {
      await invoke('update_user', {
        userId: user.id,
        username: null,
        email: null,
        password: newPassword,
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return '#666';
      case 'basic': return '#2196f3';
      case 'pro': return '#9c27b0';
      case 'enterprise': return '#ff9800';
      case 'admin': return '#cd2417';
      default: return '#666';
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Settings
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Account Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={`${user?.tier.toUpperCase()} TIER`}
                  sx={{ bgcolor: getTierColor(user?.tier || 'free'), color: 'white' }}
                />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleUpdateProfile}
                    sx={{
                      background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
                    }}
                  >
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Change Password */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    startIcon={<PasswordIcon />}
                    onClick={handleChangePassword}
                    disabled={!currentPassword || !newPassword || !confirmPassword}
                  >
                    Change Password
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Tier Info */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subscription Tier
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your current tier: <strong>{user?.tier.toUpperCase()}</strong>
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(TIER_FEATURES).map(([tier, features]) => (
                  <Grid item xs={12} sm={6} md={4} lg={2.4} key={tier}>
                    <Card
                      variant="outlined"
                      sx={{
                        border: user?.tier === tier ? '2px solid' : '1px solid',
                        borderColor: user?.tier === tier ? getTierColor(tier) : '#333',
                      }}
                    >
                      <CardContent>
                        <Chip
                          size="small"
                          label={tier.toUpperCase()}
                          sx={{ bgcolor: getTierColor(tier), color: 'white', mb: 1 }}
                        />
                        <Box>
                          {features.map((feature, i) => (
                            <Typography key={i} variant="body2" color="text.secondary">
                              • {feature}
                            </Typography>
                          ))}
                        </Box>
                        {user?.tier !== tier && user?.tier !== 'admin' && (
                          <Button size="small" sx={{ mt: 1 }}>
                            Upgrade
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* About */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                About
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rust Server Manager v1.0.0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                A comprehensive tool for managing FacePunch Rust dedicated servers.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Built with Tauri + React + TypeScript
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
