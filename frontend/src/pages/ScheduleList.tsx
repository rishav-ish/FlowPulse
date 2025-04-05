import { useState, useEffect } from 'react';
import {
  Container, Title, Text, Group, Button, 
  Table, ActionIcon, Badge, Menu, Box,
  ThemeIcon, Paper, TextInput, LoadingOverlay,
  Switch, Notification, Card, SimpleGrid, 
  Divider, Tooltip, Modal
} from '@mantine/core';
import { 
  IconSearch, IconPlus, IconDotsVertical, IconEdit, 
  IconTrash, IconPlayerPlay, IconAlertCircle, IconCheck, 
  IconClock, IconPlayerPause, IconCalendarEvent,
  IconApi, IconArrowRight
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Schedule, formatDateTime } from '../types';
import { GetAllSchedules, GetAPIByID, DeleteSchedule, ToggleSchedule } from '../../wailsjs/go/main/App';

export function ScheduleList() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{visible: boolean, title: string, message: string, color: string}>({
    visible: false,
    title: '',
    message: '',
    color: ''
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [apiNames, setApiNames] = useState<Record<number, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSchedules(schedules);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      setFilteredSchedules(
        schedules.filter((schedule) => {
          // Safe access to potentially undefined properties
          const apiId = schedule.apiId?.toString() || '';
          const expression = schedule.expression || '';
          const type = schedule.type || '';
          const apiName = apiNames[schedule.apiId] || '';
          
          return apiId.includes(lowercaseQuery) ||
            expression.toLowerCase().includes(lowercaseQuery) ||
            type.toLowerCase().includes(lowercaseQuery) ||
            apiName.toLowerCase().includes(lowercaseQuery);
        })
      );
    }
  }, [searchQuery, schedules, apiNames]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const result = await GetAllSchedules();
      setSchedules(result || []);
      setFilteredSchedules(result || []);
      
      // Load API names for each schedule
      const apiIds = Array.from(new Set(result.map(s => s.apiId)));
      const apiNamesMap: Record<number, string> = {};
      
      await Promise.all(apiIds.map(async (apiId) => {
        try {
          const api = await GetAPIByID(apiId);
          if (api) {
            apiNamesMap[apiId] = api.name;
          }
        } catch (error) {
          console.error(`Failed to load API details for ID ${apiId}:`, error);
        }
      }));
      
      setApiNames(apiNamesMap);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      showNotification('Error', 'Failed to load schedules. Please try again.', 'red');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (title: string, message: string, color: string) => {
    setNotification({
      visible: true,
      title,
      message,
      color
    });
    
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleDelete = async (schedule: Schedule) => {
    setScheduleToDelete(schedule);
    setDeleteModalOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    
    try {
      await DeleteSchedule(scheduleToDelete.id);
      setSchedules(schedules.filter(s => s.id !== scheduleToDelete.id));
      showNotification('Success', 'Schedule deleted successfully', 'green');
      setDeleteModalOpen(false);
      setScheduleToDelete(null);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      showNotification('Error', 'Failed to delete schedule. Please try again.', 'red');
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await ToggleSchedule(id, !isActive);
      
      // Create a new array with the updated schedule
      const updatedSchedules = schedules.map(schedule => {
        if (schedule.id === id) {
          return {
            ...schedule,
            isActive: !isActive
          } as Schedule;
        }
        return schedule;
      });
      
      setSchedules(updatedSchedules);
      showNotification('Success', `Schedule ${isActive ? 'paused' : 'activated'} successfully`, 'green');
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      showNotification('Error', 'Failed to update schedule status. Please try again.', 'red');
    }
  };

  const formatScheduleType = (schedule: Schedule) => {
    if (schedule.type === 'cron' && schedule.expression) {
      return {
        label: "Cron",
        expression: schedule.expression,
        color: "blue" as const
      };
    } else if (schedule.type === 'interval') {
      return {
        label: "Interval",
        expression: `Every ${schedule.expression} seconds`,
        color: "green" as const
      };
    } else {
      return {
        label: "Unknown",
        expression: "Invalid schedule configuration",
        color: "red" as const
      };
    }
  };

  const getHumanReadableExpression = (schedule: Schedule): string => {
    if (schedule.type === 'interval') {
      const seconds = parseInt(schedule.expression);
      if (seconds < 60) return `Every ${seconds} second${seconds !== 1 ? 's' : ''}`;
      if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `Every ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      const hours = Math.floor(seconds / 3600);
      return `Every ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return schedule.expression;
  };

  return (
    <Container size="xl" p="md">
      <Box pos="relative" style={{ minHeight: '200px' }}>
        <LoadingOverlay visible={loading} overlayBlur={2} />
        
        <Group position="apart" mb="xl">
          <Box>
            <Title order={2} mb={5}>Schedule Management</Title>
            <Text color="dimmed" size="sm">
              Manage your API call schedules and their configuration
            </Text>
          </Box>
          <Button 
            leftIcon={<IconPlus size={16} />} 
            onClick={() => navigate('/schedules/new')}
          >
            Add Schedule
          </Button>
        </Group>

        <Paper shadow="xs" p="md" withBorder mb="xl">
          <Group>
            <TextInput
              placeholder="Search schedules..."
              icon={<IconSearch size={16} />}
              style={{ flex: 1 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              variant="light" 
              leftIcon={<IconApi size={16} />} 
              onClick={() => navigate('/apis')}
            >
              Manage APIs
            </Button>
          </Group>
        </Paper>

        {filteredSchedules.length === 0 && !loading ? (
          <Paper shadow="xs" p="xl" withBorder style={{ textAlign: 'center' }}>
            <ThemeIcon size="xl" radius="xl" color="blue" variant="light" mb="md" style={{ margin: '0 auto' }}>
              <IconCalendarEvent size={24} />
            </ThemeIcon>
            <Title order={3} mb="xs">No Schedules Found</Title>
            <Text size="sm" color="dimmed" style={{ maxWidth: 400, margin: '0 auto' }}>
              {searchQuery.trim() !== '' 
                ? 'No schedules match your search criteria. Try adjusting your search terms.'
                : 'You haven\'t added any schedules yet. Click the button below to create your first schedule.'}
            </Text>
            <Button 
              mt="md" 
              leftIcon={<IconPlus size={16} />} 
              onClick={() => navigate('/schedules/new')}
            >
              Add New Schedule
            </Button>
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
            {filteredSchedules.map((schedule) => {
              const scheduleInfo = formatScheduleType(schedule);
              return (
                <Card key={schedule.id} shadow="sm" p="lg" radius="md" withBorder>
                  <Card.Section p="md" withBorder>
                    <Group position="apart">
                      <Group>
                        <ThemeIcon color={scheduleInfo.color} variant="light" size="lg">
                          <IconCalendarEvent size={18} />
                        </ThemeIcon>
                        <div>
                          <Text weight={500} size="sm">
                            {apiNames[schedule.apiId] || `API #${schedule.apiId}`}
                          </Text>
                          <Badge size="sm" color={scheduleInfo.color}>
                            {scheduleInfo.label}
                          </Badge>
                        </div>
                      </Group>
                      <Group spacing={8}>
                        <Tooltip label={schedule.isActive ? 'Active' : 'Paused'}>
                          <Switch
                            checked={schedule.isActive}
                            onChange={() => handleToggle(schedule.id, schedule.isActive)}
                            size="md"
                            color="green"
                            onLabel={<IconPlayerPlay size={16} stroke={1.5} />}
                            offLabel={<IconPlayerPause size={16} stroke={1.5} />}
                          />
                        </Tooltip>
                        <Menu position="bottom-end">
                          <Menu.Target>
                            <ActionIcon>
                              <IconDotsVertical size={18} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item 
                              icon={<IconEdit size={16} />}
                              onClick={() => navigate(`/schedules/edit/${schedule.id}`)}
                            >
                              Edit Schedule
                            </Menu.Item>
                            <Menu.Item 
                              icon={<IconApi size={16} />}
                              onClick={() => navigate(`/apis/${schedule.apiId}/edit`)}
                            >
                              Edit API
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item 
                              icon={<IconTrash size={16} />}
                              color="red"
                              onClick={() => handleDelete(schedule)}
                            >
                              Delete Schedule
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Group>
                  </Card.Section>
                  
                  <Box mt="md">
                    <Text size="sm" weight={500} mb={5}>Schedule Expression</Text>
                    <Text size="sm" color="dimmed">
                      {getHumanReadableExpression(schedule)}
                    </Text>
                    
                    <Divider my="md" />
                    
                    <Group position="apart">
                      <Box>
                        <Text size="xs" color="dimmed">Retry Count</Text>
                        <Text size="sm">{schedule.retryCount}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" color="dimmed">Fallback Delay</Text>
                        <Text size="sm">{schedule.fallbackDelay}s</Text>
                      </Box>
                      <Box style={{ maxWidth: '30%' }}>
                        <Text size="xs" color="dimmed" truncate>Status</Text>
                        <Badge color={schedule.isActive ? 'green' : 'orange'}>
                          {schedule.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </Box>
                    </Group>
                    
                    <Button
                      variant="light"
                      color="blue"
                      fullWidth
                      mt="md"
                      rightIcon={<IconArrowRight size={16} />}
                      onClick={() => navigate(`/schedules/edit/${schedule.id}`)}
                    >
                      Manage Schedule
                    </Button>
                  </Box>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Box>
      
      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Schedule"
        centered
      >
        <Text mb="md">
          Are you sure you want to delete the schedule for <b>{scheduleToDelete ? (apiNames[scheduleToDelete.apiId] || `API #${scheduleToDelete.apiId}`) : ''}</b>?
        </Text>
        <Text mb="xl" size="sm" color="dimmed">
          This action cannot be undone.
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
      
      {/* Notification */}
      {notification.visible && (
        <Notification
          style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}
          onClose={() => setNotification(prev => ({ ...prev, visible: false }))}
          title={notification.title}
          color={notification.color}
          icon={notification.color === 'green' ? <IconCheck size={18} /> : <IconAlertCircle size={18} />}
        >
          {notification.message}
        </Notification>
      )}
    </Container>
  );
} 