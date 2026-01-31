import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as ClearIcon,
  Link as ConnectIcon,
  LinkOff as DisconnectIcon,
} from '@mui/icons-material';
import { useStore } from '../store';

const ConsolePage: React.FC = () => {
  const {
    selectedServer,
    servers,
    selectServer,
    consoleMessages,
    sendCommand,
    connectRcon,
    disconnectRcon,
    rconConnected,
  } = useStore();

  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [localMessages, setLocalMessages] = useState(consoleMessages);
  const outputRef = useRef<HTMLDivElement>(null);

  const isConnected = selectedServer ? rconConnected[selectedServer.id] : false;

  useEffect(() => {
    setLocalMessages(consoleMessages);
    scrollToBottom();
  }, [consoleMessages]);

  useEffect(() => {
    if (selectedServer && selectedServer.status === 'online' && !isConnected) {
      connectRcon(selectedServer.id);
    }
  }, [selectedServer]);

  const scrollToBottom = () => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!command.trim() || !selectedServer) return;

    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    try {
      await sendCommand(selectedServer.id, command.trim());
    } catch (err) {
      console.error('Command error:', err);
    }

    setCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const handleConnect = async () => {
    if (!selectedServer) return;
    if (isConnected) {
      await disconnectRcon(selectedServer.id);
    } else {
      await connectRcon(selectedServer.id);
    }
  };

  const clearConsole = () => {
    setLocalMessages([]);
  };

  const getMessageClass = (type: string) => {
    switch (type) {
      case 'command':
        return 'console-command';
      case 'error':
        return 'console-error';
      case 'warning':
        return 'console-warning';
      case 'chat':
        return 'console-success';
      default:
        return 'console-response';
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString();
  };

  if (!selectedServer) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Console
        </Typography>
        <Card>
          <CardContent>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Select a server to view its console
            </Typography>
            <FormControl fullWidth>
              <Select
                value=""
                displayEmpty
                onChange={(e) => {
                  const server = servers.find((s) => s.id === e.target.value);
                  if (server) selectServer(server);
                }}
              >
                <MenuItem value="" disabled>Select Server</MenuItem>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Console
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedServer.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip
            label={isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
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
          <Tooltip title={isConnected ? 'Disconnect RCON' : 'Connect RCON'}>
            <IconButton onClick={handleConnect} color={isConnected ? 'success' : 'default'}>
              {isConnected ? <DisconnectIcon /> : <ConnectIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear Console">
            <IconButton onClick={clearConsole}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box
          ref={outputRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            bgcolor: '#0d0d0d',
            fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
            fontSize: 13,
          }}
        >
          {localMessages.map((msg, i) => (
            <Box key={i} sx={{ mb: 0.5 }}>
              <Typography
                component="span"
                sx={{ color: '#666', fontSize: 11, mr: 1 }}
              >
                [{formatTimestamp(msg.timestamp)}]
              </Typography>
              <Typography
                component="span"
                className={getMessageClass(msg.message_type)}
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              >
                {msg.message}
              </Typography>
            </Box>
          ))}
          {localMessages.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              Console output will appear here...
            </Typography>
          )}
        </Box>
        <Box sx={{ p: 2, borderTop: '1px solid #333' }}>
          <TextField
            fullWidth
            placeholder={isConnected ? 'Enter command...' : 'Connect to RCON first...'}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
            InputProps={{
              sx: {
                fontFamily: 'monospace',
                bgcolor: '#0d0d0d',
              },
              startAdornment: (
                <InputAdornment position="start">
                  <Typography sx={{ color: '#cd2417' }}>&gt;</Typography>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSend} disabled={!isConnected || !command.trim()}>
                    <SendIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Use Arrow Up/Down to navigate command history. Press Enter to send.
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default ConsolePage;
