import React, { useState, useEffect } from 'react';
import { 
  Box, Text, Button, Stack, Group, 
  Paper, Badge, Card, Container, Title
} from '@mantine/core';
import { getWailsRuntimeStatus } from './lib/wailsRuntime';

/**
 * Simple debug component to test Wails integration
 */
export function AppDebug() {
  const [status, setStatus] = useState(getWailsRuntimeStatus());
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(['Application started']);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().substring(11, 19)}: ${message}`]);
  };
  
  useEffect(() => {
    // Check runtime status every second
    const interval = setInterval(() => {
      const newStatus = getWailsRuntimeStatus();
      setStatus(newStatus);
      
      if (newStatus.available !== status.available) {
        addLog(`Runtime availability changed: ${newStatus.available}`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status]);
  
  const testBackendCall = async () => {
    try {
      addLog('Attempting to call GetAllAPIs...');
      
      if (!window.go || !window.go.main || !window.go.main.App) {
        throw new Error('Wails runtime not available');
      }
      
      const result = await window.go.main.App.GetAllAPIs();
      setApiResponse(result);
      addLog(`API call successful, received ${result ? result.length : 0} APIs`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      addLog(`API call failed: ${errorMessage}`);
    }
  };
  
  return (
    <Container size="md" p="md">
      <Title order={2} mb="md">FlowPulse Debug Console</Title>
      
      <Card mb="md" withBorder p="md">
        <Title order={4} mb="sm">Wails Runtime Status</Title>
        <Stack spacing="xs">
          <Group position="apart">
            <Text>Window object</Text>
            <Badge color={typeof window !== 'undefined' ? 'green' : 'red'}>
              {typeof window !== 'undefined' ? 'Available' : 'Not Available'}
            </Badge>
          </Group>
          
          <Group position="apart">
            <Text>window.go</Text>
            <Badge color={status.goExists ? 'green' : 'red'}>
              {status.goExists ? 'Available' : 'Not Available'}
            </Badge>
          </Group>
          
          <Group position="apart">
            <Text>window.go.main</Text>
            <Badge color={status.mainExists ? 'green' : 'red'}>
              {status.mainExists ? 'Available' : 'Not Available'}
            </Badge>
          </Group>
          
          <Group position="apart">
            <Text>window.go.main.App</Text>
            <Badge color={status.appExists ? 'green' : 'red'}>
              {status.appExists ? 'Available' : 'Not Available'}
            </Badge>
          </Group>
          
          <Group position="apart">
            <Text>Backend Functions</Text>
            <Badge color={status.funcExists ? 'green' : 'red'}>
              {status.funcExists ? 'Available' : 'Not Available'}
            </Badge>
          </Group>
        </Stack>
      </Card>
      
      <Group mb="md">
        <Button onClick={testBackendCall} disabled={!status.funcExists}>
          Test Backend Call
        </Button>
        <Button onClick={() => setLogs([])} variant="outline">
          Clear Logs
        </Button>
      </Group>
      
      {error && (
        <Paper p="md" mb="md" style={{ backgroundColor: '#FEE2E2', color: '#7F1D1D' }}>
          <Text weight={500} mb={5}>Error</Text>
          <Text size="sm">{error}</Text>
        </Paper>
      )}
      
      {apiResponse && (
        <Paper p="md" mb="md" withBorder>
          <Title order={5} mb="xs">API Response</Title>
          <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </Paper>
      )}
      
      <Paper p="md" withBorder>
        <Title order={5} mb="xs">Logs</Title>
        <Box 
          sx={{ 
            backgroundColor: '#1E1E1E', 
            color: '#FFFFFF',
            padding: '8px',
            borderRadius: '4px',
            maxHeight: '300px',
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}
        >
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </Box>
      </Paper>
    </Container>
  );
} 