import { useState, useEffect } from 'react';
import {
  Container, Title, Text, Group, Box, Button,
  Paper, Table, Badge, Pagination, Select,
  Stack, ActionIcon, LoadingOverlay, ThemeIcon
} from '@mantine/core';
import {
  IconRefresh, IconClock, IconFileExport,
  IconCheck, IconX, IconAlertTriangle
} from '@tabler/icons-react';
import { ExecutionLog, formatDateTime, formatStatusCode } from '../types';
import { GetAllExecutionLogs } from '../../wailsjs/go/main/App';

export function LogViewer() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<string>("25");
  
  useEffect(() => {
    loadLogs();
  }, [page, pageSize]);
  
  const loadLogs = async () => {
    setLoading(true);
    try {
      // Load logs with limit based on page size
      const limit = parseInt(pageSize);
      const result = await GetAllExecutionLogs(page, limit);
      setLogs(result || []);
      
      // For now, we'll assume there are more pages if we get a full page of results
      setTotalPages(result.length === limit ? page + 1 : page);
    } catch (error) {
      console.error('Failed to load execution logs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'green';
    if (statusCode >= 300 && statusCode < 400) return 'blue';
    if (statusCode >= 400 && statusCode < 500) return 'yellow';
    if (statusCode >= 500) return 'red';
    return 'gray';
  };
  
  const exportLogs = () => {
    // Create a CSV file with the logs
    const header = ['API ID', 'Status Code', 'Executed At', 'Response Body'];
    const csvContent = [
      header.join(','),
      ...logs.map(log => [
        log.apiId,
        log.statusCode,
        formatDateTime(log.executedAt),
        `"${log.response?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ].join('\n');
    
    // Create a download link and trigger it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `flowpulse_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Container size="xl" p="md">
      <Box pos="relative" style={{ minHeight: '200px' }}>
        <LoadingOverlay visible={loading} overlayBlur={2} />
        
        <Box mb="xl">
          <Group position="apart" mb="xs">
            <Title order={2}>Execution Logs</Title>
            <Group spacing="xs">
              <Button 
                variant="light" 
                leftIcon={<IconFileExport size={16} />} 
                onClick={exportLogs}
                disabled={logs.length === 0}
              >
                Export CSV
              </Button>
              <Button 
                variant="subtle" 
                leftIcon={<IconRefresh size={16} />} 
                onClick={loadLogs}
              >
                Refresh
              </Button>
            </Group>
          </Group>
          <Text color="dimmed" size="sm">
            View execution history and results of your API calls
          </Text>
        </Box>
        
        {logs.length === 0 && !loading ? (
          <Paper shadow="xs" radius="md" p="xl" withBorder style={{ textAlign: 'center' }}>
            <ThemeIcon size="xl" radius="xl" color="blue" variant="light" mb="md" style={{ margin: '0 auto' }}>
              <IconClock size={24} />
            </ThemeIcon>
            <Title order={3} mb="xs">No Execution Logs</Title>
            <Text size="sm" color="dimmed" style={{ maxWidth: 400, margin: '0 auto' }}>
              No API execution logs are available yet. Logs will appear here after API executions occur.
            </Text>
          </Paper>
        ) : (
          <Stack spacing="md">
            <Paper shadow="xs" radius="md" withBorder>
              <Table striped highlightOnHover>
                <thead>
                  <tr>
                    <th>API ID</th>
                    <th>Status</th>
                    <th>Executed At</th>
                    <th>Response Body</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <Text weight={500}>{log.apiId}</Text>
                      </td>
                      <td>
                        <Group spacing="xs">
                          <ThemeIcon
                            size="xs"
                            radius="xl"
                            color={getStatusColor(log.statusCode)}
                            variant="filled"
                          >
                            {log.statusCode >= 200 && log.statusCode < 300 ? (
                              <IconCheck size={10} />
                            ) : (
                              <IconX size={10} />
                            )}
                          </ThemeIcon>
                          <Badge 
                            color={getStatusColor(log.statusCode)} 
                            variant="filled"
                          >
                            {formatStatusCode(log.statusCode)}
                          </Badge>
                        </Group>
                      </td>
                      <td>{formatDateTime(log.executedAt)}</td>
                      <td style={{ maxWidth: '300px' }}>
                        <Text size="sm" lineClamp={1} title={log.response || ''}>
                          {log.response || '(empty)'}
                        </Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Paper>
            
            <Group position="apart">
              <Select
                label="Page size"
                value={pageSize}
                onChange={(value) => {
                  setPageSize(value || "25");
                  setPage(1);
                }}
                data={[
                  { value: "10", label: "10 per page" },
                  { value: "25", label: "25 per page" },
                  { value: "50", label: "50 per page" },
                  { value: "100", label: "100 per page" }
                ]}
                style={{ width: 150 }}
              />
              <Pagination 
                total={totalPages} 
                value={page} 
                onChange={setPage} 
              />
            </Group>
          </Stack>
        )}
      </Box>
    </Container>
  );
} 