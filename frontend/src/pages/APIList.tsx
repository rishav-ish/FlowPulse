import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Title, Button, Group, Paper, Table,
  ActionIcon, Badge, Text, Menu, Modal,
  LoadingOverlay, Alert, SimpleGrid, Card,
  ThemeIcon, Tooltip, Box, useMantineTheme,
  Divider, TextInput, Notification,
  Drawer, Code
} from '@mantine/core';
import {
  IconPlus, IconEdit, IconTrash, IconPlayerPlay, IconAlertCircle, 
  IconDotsVertical, IconLink, IconClipboard, IconSearch,
  IconCheck, IconX, IconClock, IconApi, IconInfoCircle
} from '@tabler/icons-react';
import { ExecutionLog, API } from '../types';
import { GetAllAPIs, DeleteAPI, ExecuteAPIManually, GetExecutionLogsByAPIID } from '../../wailsjs/go/main/App';
import { formatDateTime } from '../types';
import { waitForWailsRuntime, getWailsRuntimeStatus, callBackend } from '../lib/wailsRuntime';

export function APIList() {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const [apis, setApis] = useState<API[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [apiToDelete, setApiToDelete] = useState<API | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isExecuting, setIsExecuting] = useState<number | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionLog | null>(null);
  const [executionDrawerOpen, setExecutionDrawerOpen] = useState(false);
  const [selectedApiLogs, setSelectedApiLogs] = useState<ExecutionLog[]>([]);
  const [selectedApi, setSelectedApi] = useState<API | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      // Wait for Wails runtime to be ready
      const runtimeReady = await waitForWailsRuntime(10000);
      if (runtimeReady) {
        loadAPIs();
      } else {
        setError("Failed to connect to the backend. Please restart the application.");
        const status = getWailsRuntimeStatus();
        setDebugInfo(`Runtime status: ${status.details}`);
      }
    };
    
    initializeApp();
  }, []);

  const loadAPIs = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      // Get runtime status
      const status = getWailsRuntimeStatus();
      setDebugInfo(`Runtime status: ${status.details}`);
      
      // Try to get APIs using our helper
      try {
        const data = await callBackend<API[]>('GetAllAPIs', []);
        console.log("API data received:", data);
        setApis(data || []);
      } catch (err) {
        console.error("Error in callBackend:", err);
        
        // Fall back to direct call
        const data = await GetAllAPIs();
        setApis(data || []);
      }
    } catch (err) {
      setError(`Failed to load APIs: ${err}. Please try again.`);
      console.error('Error loading APIs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApis = apis.filter(api => {
    const query = searchQuery.toLowerCase();
    return (
      api.name.toLowerCase().includes(query) ||
      api.url.toLowerCase().includes(query) ||
      api.method.toLowerCase().includes(query) ||
      api.description.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (api: API) => {
    setApiToDelete(api);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!apiToDelete) return;

    setLoading(true);
    setError(null);

    try {
      await callBackend<void>('DeleteAPI', [apiToDelete.id]);
      setApis(apis.filter(api => api.id !== apiToDelete.id));
      setDeleteModalOpen(false);
      setApiToDelete(null);
      showNotification('API was deleted successfully');
    } catch (err) {
      setError('Failed to delete API. Please try again.');
      console.error('Error deleting API:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string) => {
    setNotificationMessage(message);
    setNotificationOpen(true);
    setTimeout(() => setNotificationOpen(false), 3000);
  };

  const handleExecute = async (api: API) => {
    setIsExecuting(api.id);
    setError(null);

    try {
      await callBackend<void>('ExecuteAPIManually', [api.id]);
      showNotification(`API "${api.name}" was executed successfully`);
      
      // Get the latest logs for this API
      const logs = await callBackend<ExecutionLog[]>('GetExecutionLogsByAPIID', [api.id, 5]);
      if (logs && logs.length > 0) {
        setExecutionResult(logs[0]);
        setExecutionDrawerOpen(true);
      }
    } catch (err) {
      setError(`Failed to execute API "${api.name}". Please try again.`);
      console.error('Error executing API:', err);
    } finally {
      setIsExecuting(null);
    }
  };

  const viewApiLogs = async (api: API) => {
    setSelectedApi(api);
    setLoading(true);
    try {
      const logs = await callBackend<ExecutionLog[]>('GetExecutionLogsByAPIID', [api.id, 10]);
      setSelectedApiLogs(logs || []);
      setExecutionDrawerOpen(true);
    } catch (err) {
      console.error('Error loading API logs:', err);
      setError('Failed to load API execution logs');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('Copied to clipboard');
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'blue';
      case 'POST': return 'green';
      case 'PUT': return 'yellow';
      case 'DELETE': return 'red';
      case 'PATCH': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <Container size="xl" p="md">
      <Paper shadow="xs" p="md" withBorder>
        <LoadingOverlay visible={loading} />
        
        {/* Debug info for troubleshooting */}
        {debugInfo && (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" mb="md" sx={{ wordBreak: 'break-word' }}>
            <Text size="xs">{debugInfo}</Text>
          </Alert>
        )}
        
        <Group position="apart" mb="xl">
          <Box>
            <Title order={2} mb={5}>API Management</Title>
            <Text color="dimmed" size="sm">
              Create, test and manage your APIs
            </Text>
          </Box>
          <Button
            leftIcon={<IconPlus size={16} />}
            onClick={() => navigate('/apis/new')}
          >
            Create API
          </Button>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
            {error}
          </Alert>
        )}

        <TextInput
          icon={<IconSearch size={18} />}
          placeholder="Search by name, URL, method or description..."
          mb="lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />

        {filteredApis.length === 0 ? (
          <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
            <ThemeIcon size="xl" radius="xl" color="blue" variant="light" mb="md" style={{ margin: '0 auto' }}>
              <IconApi size={24} />
            </ThemeIcon>
            <Title order={3} mb="xs">No APIs Found</Title>
            <Text size="sm" color="dimmed" style={{ maxWidth: 400, margin: '0 auto' }}>
              {searchQuery ? 
                'No APIs match your search criteria. Try a different search term.' : 
                'You have not created any APIs yet. Click the "Create API" button to get started.'}
            </Text>
            {!searchQuery && (
              <Button 
                mt="md" 
                leftIcon={<IconPlus size={16} />} 
                onClick={() => navigate('/apis/new')}
              >
                Create Your First API
              </Button>
            )}
          </Paper>
        ) : (
          <SimpleGrid 
            cols={3} 
            spacing="md" 
            breakpoints={[
              { maxWidth: 'md', cols: 2, spacing: 'sm' },
              { maxWidth: 'xs', cols: 1, spacing: 'sm' },
            ]}
          >
            {filteredApis.map((api) => (
              <Card key={api.id} shadow="sm" p="lg" radius="md" withBorder>
                <Card.Section p="md" style={{ 
                  borderBottom: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]}`
                }}>
                  <Group position="apart" noWrap>
                    <Group spacing="xs" noWrap style={{ flex: 1, minWidth: 0 }}>
                      <Badge size="lg" color={getMethodColor(api.method)} style={{ flexShrink: 0 }}>
                        {api.method}
                      </Badge>
                      <Tooltip label="View execution logs">
                        <ActionIcon variant="light" onClick={() => viewApiLogs(api)} style={{ flexShrink: 0 }}>
                          <IconClock size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon style={{ flexShrink: 0 }}>
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item 
                          icon={<IconEdit size={16} />}
                          onClick={() => navigate(`/apis/${api.id}/edit`)}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item 
                          icon={<IconClipboard size={16} />}
                          onClick={() => copyToClipboard(api.url)}
                        >
                          Copy URL
                        </Menu.Item>
                        <Menu.Item 
                          icon={<IconLink size={16} />}
                          component="a"
                          href={api.url}
                          target="_blank"
                        >
                          Open URL
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item 
                          color="red"
                          icon={<IconTrash size={16} />}
                          onClick={() => handleDelete(api)}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Card.Section>
                
                <Box mt="md" mb="md" sx={{ height: '130px', display: 'flex', flexDirection: 'column' }}>
                  <Text weight={500} size="lg" mb={5} lineClamp={1} title={api.name}>
                    {api.name}
                  </Text>
                  <Text size="sm" color="dimmed" mb="md" lineClamp={2} title={api.description || 'No description'}>
                    {api.description || 'No description'}
                  </Text>
                  <Box mt="auto">
                    <Text size="xs" color="dimmed" lineClamp={1} title={api.url}>
                      {api.url}
                    </Text>
                  </Box>
                </Box>
                
                <Button
                  variant="light"
                  color="blue"
                  fullWidth
                  leftIcon={<IconPlayerPlay size={16} />}
                  onClick={() => handleExecute(api)}
                  loading={isExecuting === api.id}
                >
                  Execute Now
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Paper>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete API"
        centered
      >
        <Text mb="md">
          Are you sure you want to delete the API <b style={{ wordBreak: 'break-word' }}>{apiToDelete?.name}</b>? This action cannot be undone.
        </Text>
        <Text mb="xl" size="sm" color="dimmed">
          Any schedules using this API will also be affected.
        </Text>
        <Group position="right">
          <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Delete
          </Button>
        </Group>
      </Modal>

      {/* Execution Logs Drawer */}
      <Drawer
        opened={executionDrawerOpen}
        onClose={() => setExecutionDrawerOpen(false)}
        title={selectedApi ? 
          <Text lineClamp={1} style={{ maxWidth: 'calc(100% - 40px)' }}>
            Execution Logs: {selectedApi.name}
          </Text> : 
          "Execution Result"
        }
        padding="md"
        size="xl"
        position="right"
      >
        {selectedApiLogs.length > 0 ? (
          <>
            <Text mb="md">Recent execution logs for this API:</Text>
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>Status</th>
                    <th style={{ width: '180px' }}>Time</th>
                    <th>Response</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedApiLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <Group spacing="xs" noWrap>
                          <ThemeIcon
                            size="xs"
                            radius="xl"
                            color={log.statusCode >= 200 && log.statusCode < 300 ? 'green' : 'red'}
                          >
                            {log.statusCode >= 200 && log.statusCode < 300 ? 
                              <IconCheck size={10} /> : <IconX size={10} />}
                          </ThemeIcon>
                          <Text>{log.statusCode}</Text>
                        </Group>
                      </td>
                      <td>{formatDateTime(log.executedAt)}</td>
                      <td>
                        <Text size="sm" sx={{ 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '300px'
                        }}>
                          {log.response?.substring(0, 50) || '(empty)'}
                        </Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Box>
            <Button 
              mt="lg" 
              variant="subtle" 
              onClick={() => navigate('/logs')}
              leftIcon={<IconClock size={16} />}
            >
              View All Logs
            </Button>
          </>
        ) : executionResult ? (
          <Box>
            <Group mb="md">
              <Badge 
                size="lg" 
                color={executionResult.statusCode >= 200 && executionResult.statusCode < 300 ? 'green' : 'red'}
              >
                Status: {executionResult.statusCode}
              </Badge>
            </Group>
            
            <Text weight={500} mb="xs">Response:</Text>
            <Paper withBorder p="sm" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {executionResult.response || '(empty)'}
              </Code>
            </Paper>
            
            <Text size="sm" color="dimmed" mt="md">
              Executed at {formatDateTime(executionResult.executedAt)}
            </Text>
          </Box>
        ) : (
          <Text color="dimmed">No execution logs available.</Text>
        )}
      </Drawer>
      
      {/* Success Notification */}
      {notificationOpen && (
        <Notification
          style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}
          onClose={() => setNotificationOpen(false)}
          title="Success"
          icon={<IconCheck size={18} />}
          color="teal"
        >
          {notificationMessage}
        </Notification>
      )}
    </Container>
  );
} 