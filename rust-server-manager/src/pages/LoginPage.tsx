import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Link,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  Email,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

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

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, resetPassword, error, loading } = useStore();

  const [tab, setTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [formError, setFormError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!loginUsername || !loginPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    const result = await login(loginUsername, loginPassword, rememberMe);
    if (result.success) {
      navigate('/');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!regUsername || !regEmail || !regPassword || !regConfirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (regPassword.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    const result = await register(regUsername, regEmail, regPassword);
    if (result.success) {
      navigate('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!forgotEmail || !newPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    const success = await resetPassword(forgotEmail, newPassword);
    if (success) {
      setForgotSuccess(true);
      setTimeout(() => {
        setShowForgot(false);
        setForgotSuccess(false);
      }, 2000);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          bgcolor: '#252525',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: '1px solid #333',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="svg"
              viewBox="0 0 100 100"
              sx={{ width: 80, height: 80, mb: 2 }}
            >
              <circle cx="50" cy="50" r="45" stroke="#cd2417" strokeWidth="4" fill="none" />
              <path d="M30 35 L50 25 L70 35 L70 65 L50 75 L30 65 Z" fill="#cd2417" opacity="0.8" />
              <path d="M50 25 L50 75" stroke="#fff" strokeWidth="2" />
              <path d="M30 35 L70 65" stroke="#fff" strokeWidth="2" />
              <path d="M70 35 L30 65" stroke="#fff" strokeWidth="2" />
            </Box>
            <Typography variant="h5" fontWeight={600} color="text.primary">
              Rust Server Manager
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage your Rust servers with ease
            </Typography>
          </Box>

          {(error || formError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || formError}
            </Alert>
          )}

          {!showForgot ? (
            <>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="fullWidth"
                sx={{
                  mb: 2,
                  '& .MuiTab-root': {
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      color: '#cd2417',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    bgcolor: '#cd2417',
                  },
                }}
              >
                <Tab label="Login" />
                <Tab label="Register" />
              </Tabs>

              <TabPanel value={tab} index={0}>
                <form onSubmit={handleLogin}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          sx={{
                            color: 'text.secondary',
                            '&.Mui-checked': { color: '#cd2417' },
                          }}
                        />
                      }
                      label={<Typography variant="body2">Remember me</Typography>}
                    />
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={() => setShowForgot(true)}
                      sx={{ color: '#cd2417' }}
                    >
                      Forgot Password?
                    </Link>
                  </Box>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{
                      mt: 3,
                      py: 1.5,
                      background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #a02018 0%, #de3020 100%)',
                      },
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                  </Button>
                </form>
              </TabPanel>

              <TabPanel value={tab} index={1}>
                <form onSubmit={handleRegister}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{
                      mt: 3,
                      py: 1.5,
                      background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #a02018 0%, #de3020 100%)',
                      },
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                  </Button>
                </form>
              </TabPanel>
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Reset Password
              </Typography>
              {forgotSuccess ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Password reset successful! Redirecting...
                </Alert>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setShowForgot(false)}
                    >
                      Back to Login
                    </Button>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      sx={{
                        background: 'linear-gradient(135deg, #cd2417 0%, #f04d3c 100%)',
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset'}
                    </Button>
                  </Box>
                </form>
              )}
            </>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Default credentials: admin / admin123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
