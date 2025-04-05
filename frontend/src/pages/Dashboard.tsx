import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Grid, Paper, Text, Title, Group,
  Badge, Button, RingProgress, Card, SimpleGrid,
  ThemeIcon, Divider, Timeline, ActionIcon, Skeleton,
  useMantineTheme
} from '@mantine/core';
import {
  IconApi, IconCalendarEvent, IconFileReport, IconPlus,
  IconPlayerPlay, IconArrowRight, IconCheck, IconX,
  IconAlertCircle, IconClock, IconExternalLink
} from '@tabler/icons-react';
import { API, ExecutionLog, Schedule } from '../types';
import { formatDateTime } from '../types';
import { 
  GetAllAPIs, GetAllSchedules, GetRecentExecutions, 
  ExecuteAPIManually 
} from '../../wailsjs/go/main/App';

export function Dashboard() {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const [apis, setApis] = useState<API[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [recentLogs, setRecentLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingApiId, setExecutingApiId] = useState<number | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      let apisData: API[] = [];
      let schedulesData: Schedule[] = [];
      let logsData: ExecutionLog[] = [];
      
      try {
        apisData = await GetAllAPIs() || [];
      } catch (err) {
        console.error('Error fetching APIs:', err);
      }
      
      try {
        schedulesData = await GetAllSchedules() || [];
      } catch (err) {
        console.error('Error fetching schedules:', err);
      }
      
      try {
        logsData = await GetRecentExecutions(5) || [];
      } catch (err) {
        console.error('Error fetching logs:', err);
      }

      setApis(apisData);
      setSchedules(schedulesData);
      setRecentLogs(logsData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (api: API) => {
    setExecutingApiId(api.id);
    try {
      await ExecuteAPIManually(api.id);
      // Refresh recent logs after execution
      const logsData = await GetRecentExecutions(5);
      setRecentLogs(logsData);
    } catch (err) {
      console.error('Error executing API:', err);
    } finally {
      setExecutingApiId(null);
    }
  };

  const getSuccessRate = (): number => {
    if (!recentLogs || recentLogs.length === 0) return 0;
    
    const successfulLogs = recentLogs.filter(log => 
      log.statusCode >= 200 && log.statusCode < 300
    ).length;
    
    return (successfulLogs / recentLogs.length) * 100;
  };

  const getActiveSchedules = (): number => {
    if (!schedules) return 0;
    return schedules.filter(schedule => schedule.isActive).length;
  };

  const getStatusColor = (statusCode: number): string => {
    if (statusCode >= 200 && statusCode < 300) return theme.colors.green[6];
    if (statusCode >= 300 && statusCode < 400) return theme.colors.yellow[6];
    if (statusCode >= 400 && statusCode < 500) return theme.colors.orange[6];
    if (statusCode >= 500) return theme.colors.red[6];
    return theme.colors.gray[6];
  };

  // Loading skeletons
  if (loading) {
    return (
      <Container size="xl" p="md">
        <Grid gutter="md">
          <Grid.Col span={12}>
            <Skeleton height={50} width="50%" mb="xl" />
          </Grid.Col>
          <Grid.Col xs={12} sm={6} md={4}>
            <Skeleton height={160} radius="md" />
          </Grid.Col>
          <Grid.Col xs={12} sm={6} md={4}>
            <Skeleton height={160} radius="md" />
          </Grid.Col>
          <Grid.Col xs={12} sm={6} md={4}>
            <Skeleton height={160} radius="md" />
          </Grid.Col>
          <Grid.Col xs={12} md={6}>
            <Skeleton height={200} radius="md" />
          </Grid.Col>
          <Grid.Col xs={12} md={6}>
            <Skeleton height={200} radius="md" />
          </Grid.Col>
        </Grid>
      </Container>
    );
  }

  return (
    <Container size="xl" p="md">
      <Title order={2} mb="lg">Dashboard</Title>
      
      {error && (
        <Paper p="md" mb="lg" style={{ backgroundColor: theme.colors.red[0], color: theme.colors.red[9] }}>
          <Group>
            <IconAlertCircle size={16} />
            <Text>{error}</Text>
          </Group>
        </Paper>
      )}

      {/* Stats Cards */}
      <SimpleGrid
        cols={3}
        spacing="lg"
        breakpoints={[
          { maxWidth: 'md', cols: 2 },
          { maxWidth: 'xs', cols: 1 }
        ]}
        mb="xl"
      >
        <StatsCard
          icon={<IconApi size={28} stroke={1.5} />}
          title="Total APIs"
          value={(apis?.length || 0).toString()}
          description="Registered endpoints"
          color="blue"
          onClick={() => navigate('/apis')}
        />
        <StatsCard
          icon={<IconCalendarEvent size={28} stroke={1.5} />}
          title="Active Schedules"
          value={`${getActiveSchedules()}/${schedules?.length || 0}`}
          description="Automatic executions"
          color="green"
          onClick={() => navigate('/schedules')}
        />
        <StatsCard
          icon={<IconFileReport size={28} stroke={1.5} />}
          title="Success Rate"
          value={`${Math.round(getSuccessRate())}%`}
          description="Based on recent executions"
          color={getSuccessRate() > 75 ? "green" : getSuccessRate() > 50 ? "yellow" : "red"}
          onClick={() => navigate('/logs')}
        />
      </SimpleGrid>

      <Grid gutter="lg">
        {/* Recent API Executions */}
        <Grid.Col sm={12} md={6}>
          <Paper withBorder p="md" radius="md">
            <Group position="apart" mb="md">
              <Title order={3} size="h4">Recent Activity</Title>
              <Button 
                variant="subtle" 
                rightIcon={<IconArrowRight size={16} />}
                onClick={() => navigate('/logs')}
                size="xs"
              >
                View All Logs
              </Button>
            </Group>
            <Divider mb="md" />
            
            {!recentLogs || recentLogs.length === 0 ? (
              <Text color="dimmed" align="center" py="lg">
                No recent executions found.
              </Text>
            ) : (
              <Timeline active={recentLogs.length} bulletSize={24} lineWidth={2}>
                {recentLogs.map((log) => (
                  <Timeline.Item 
                    key={log.id}
                    bullet={
                      log.statusCode >= 200 && log.statusCode < 300 
                        ? <IconCheck size={12} /> 
                        : <IconX size={12} />
                    }
                    color={log.statusCode >= 200 && log.statusCode < 300 ? 'green' : 'red'}
                  >
                    <Group position="apart" noWrap>
                      <div>
                        <Text size="sm" weight={500}>
                          API {log.apiId} 
                          <Badge 
                            size="xs" 
                            color={getStatusColor(log.statusCode)} 
                            ml={5}
                          >
                            {log.statusCode}
                          </Badge>
                        </Text>
                        <Text size="xs" color="dimmed">
                          {formatDateTime(log.executedAt)}
                        </Text>
                      </div>
                      <ActionIcon 
                        size="sm" 
                        color="blue" 
                        onClick={() => navigate(`/logs?api=${log.apiId}`)}
                      >
                        <IconExternalLink size={14} />
                      </ActionIcon>
                    </Group>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Paper>
        </Grid.Col>

        {/* Quick Actions */}
        <Grid.Col sm={12} md={6}>
          <Paper withBorder p="md" radius="md">
            <Group position="apart" mb="md">
              <Title order={3} size="h4">Quick Actions</Title>
              <Button 
                variant="subtle" 
                rightIcon={<IconArrowRight size={16} />}
                onClick={() => navigate('/apis/new')}
                size="xs"
              >
                New API
              </Button>
            </Group>
            <Divider mb="md" />
            
            {!apis || apis.length === 0 ? (
              <Card withBorder p="lg" radius="md" style={{ textAlign: 'center' }}>
                <ThemeIcon size="xl" radius="xl" color="blue" mx="auto" mb="md">
                  <IconApi size={24} />
                </ThemeIcon>
                <Text weight={500} mb="xs">No APIs Created Yet</Text>
                <Text size="sm" color="dimmed" mb="md">
                  Get started by creating your first API endpoint.
                </Text>
                <Button leftIcon={<IconPlus size={16} />} onClick={() => navigate('/apis/new')}>
                  Create API
                </Button>
              </Card>
            ) : (
              <div>
                {apis.slice(0, 5).map((api) => (
                  <Group key={api.id} position="apart" mb="xs" p="xs" style={{ 
                    borderRadius: theme.radius.sm, 
                  }} sx={(theme) => ({
                    '&:hover': { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0] }
                  })}>
                    <Group spacing="sm" noWrap>
                      <Badge>{api.method}</Badge>
                      <div>
                        <Text size="sm" weight={500} lineClamp={1}>
                          {api.name}
                        </Text>
                        <Text size="xs" color="dimmed" lineClamp={1}>
                          {api.url}
                        </Text>
                      </div>
                    </Group>
                    <ActionIcon 
                      color="blue" 
                      onClick={() => handleExecute(api)}
                      loading={executingApiId === api.id}
                    >
                      <IconPlayerPlay size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                
                {apis && apis.length > 5 && (
                  <Button 
                    variant="light" 
                    fullWidth 
                    mt="md"
                    onClick={() => navigate('/apis')}
                  >
                    View All ({apis.length}) APIs
                  </Button>
                )}
              </div>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  color: string;
  onClick?: () => void;
}

function StatsCard({ icon, title, value, description, color, onClick }: StatsCardProps) {
  const theme = useMantineTheme();
  
  return (
    <Paper withBorder p="md" radius="md" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <Group position="apart">
        <div>
          <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
            {title}
          </Text>
          <Text weight={700} size="xl" mb={2}>
            {value}
          </Text>
          <Text size="xs" color="dimmed">
            {description}
          </Text>
        </div>
        <ThemeIcon color={color} variant="light" size="lg" radius="lg">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
} 