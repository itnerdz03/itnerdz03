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
  Alert,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useStore } from '../store';
import { invoke } from '@tauri-apps/api/tauri';
import type { User, UserTier } from '../types';

const UsersPage: React.FC = () => {
  const { user: currentUser } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editTier, setEditTier] = useState<UserTier>('free');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await invoke<User[]>('get_all_users');
      setUsers(data);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditTier(user.tier);
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      await invoke('update_user_tier', { userId: selectedUser.id, tier: editTier });
      setMessage({ type: 'success', text: 'User updated successfully!' });
      setEditDialogOpen(false);
      await loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await invoke('delete_user', { userId: selectedUser.id });
      setMessage({ type: 'success', text: 'User deleted' });
      setDeleteDialogOpen(false);
      await loadUsers();
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

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Check if current user is admin
  if (currentUser?.tier !== 'admin') {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          User Management
        </Typography>
        <Alert severity="error">
          You do not have permission to access this page. Admin access required.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {users.length} registered users
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadUsers}>
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

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by username or email..."
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

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Typography fontWeight={500}>{user.username}</Typography>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={user.tier.toUpperCase()}
                    sx={{ bgcolor: getTierColor(user.tier), color: 'white' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={user.is_active ? 'ACTIVE' : 'INACTIVE'}
                    color={user.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'Never'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleEditUser(user)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }}
                      disabled={user.id === currentUser?.id}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No users found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            User: <strong>{selectedUser?.username}</strong>
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Tier</InputLabel>
            <Select
              value={editTier}
              label="Tier"
              onChange={(e) => setEditTier(e.target.value as UserTier)}
            >
              <MenuItem value="free">Free</MenuItem>
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="pro">Pro</MenuItem>
              <MenuItem value="enterprise">Enterprise</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{selectedUser?.username}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
