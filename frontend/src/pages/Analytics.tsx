import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container, Title, Grid, Paper, Text, Group,
  Select, Loader, RingProgress, Stack, Card,
  Badge, useMantineTheme
} from '@mantine/core';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { API, AnalyticsSummary, StatusCounts } from '../types';
import { formatDateTime } from '../types';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle
);

// Default empty analytics data
const emptyAnalytics: AnalyticsSummary = {
  totalExecutions: 0,
  successCount: 0,
  failureCount: 0,
  successRate: 0,
  averageTimeMs: 0,
  lastExecutionTime: '',
  errorRate: 0,
  uptime: 0
};

export function Analytics() {
  const theme = useMantineTheme();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [apis, setApis] = useState<API[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<number | null>(id ? parseInt(id) : null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary>(emptyAnalytics);
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null);
  const [overallAnalytics, setOverallAnalytics] = useState<AnalyticsSummary>(emptyAnalytics);

  // Load all APIs for the dropdown
  useEffect(() => {
    const loadApis = async () => {
      try {
        const data = await window.go.main.App.GetAllAPIs();
        setApis(data || []);
      } catch (err) {
        console.error('Failed to load APIs:', err);
      }
    };
    
    loadApis();
  }, []);

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      
      try {
        // Load overall analytics
        const overall = await window.go.main.App.GetOverallAnalytics();
        setOverallAnalytics(overall || emptyAnalytics);
        
        // If an API is selected, load its specific analytics
        if (selectedApiId) {
          const apiAnalytics = await window.go.main.App.GetAPIAnalytics(selectedApiId);
          setAnalyticsData(apiAnalytics || emptyAnalytics);
          
          const counts = await window.go.main.App.GetExecutionStatusCounts(selectedApiId);
          setStatusCounts(counts || { success: 0, redirect: 0, client_error: 0, server_error: 0, other: 0 });
        } else {
          setAnalyticsData(emptyAnalytics);
          setStatusCounts(null);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadAnalytics();
  }, [selectedApiId]);

  const handleApiChange = (value: string | null) => {
    setSelectedApiId(value ? parseInt(value) : null);
  };

  // Prepare data for the status distribution pie chart
  const getStatusPieData = () => {
    if (!statusCounts) return null;
    
    return {
      labels: ['Success (2xx)', 'Redirect (3xx)', 'Client Error (4xx)', 'Server Error (5xx)', 'Other'],
      datasets: [
        {
          data: [
            statusCounts.success || 0,
            statusCounts.redirect || 0,
            statusCounts.client_error || 0,
            statusCounts.server_error || 0,
            statusCounts.other || 0,
          ],
          backgroundColor: [
            theme.colors.green[6],
            theme.colors.blue[6],
            theme.colors.orange[6],
            theme.colors.red[6],
            theme.colors.gray[6],
          ],
          borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
          borderWidth: 1,
        },
      ],
    };
  };

  // Success vs Failure bar chart data
  const getSuccessFailureData = (data: AnalyticsSummary) => {
    return {
      labels: ['Success', 'Failure'],
      datasets: [
        {
          label: 'Execution Count',
          data: [data.successCount, data.failureCount],
          backgroundColor: [theme.colors.green[6], theme.colors.red[6]],
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <Container size="xl" p="md">
      <Title order={2} mb="lg">API Analytics</Title>
      
      <Paper p="md" withBorder mb="xl">
        <Group position="apart" mb="md">
          <Text weight={500} size="lg">Select API for Detailed Analytics</Text>
          <Select
            placeholder="Select an API"
            value={selectedApiId?.toString() || null}
            onChange={handleApiChange}
            data={[
              { value: '', label: 'Overall Analytics' },
              ...apis.map(api => ({ value: api.id.toString(), label: api.name }))
            ]}
            style={{ width: 300 }}
            clearable
          />
        </Group>
      </Paper>
      
      {loading ? (
        <Group position="center" mt="xl">
          <Loader />
        </Group>
      ) : (
        <>
          {/* Overall Stats Section */}
          <Grid mb="xl">
            <Grid.Col xs={12} sm={6} md={3}>
              <Card p="lg" withBorder sx={{ height: 120 }}>
                <Text size="sm" color="dimmed" mb="xs">Total Executions</Text>
                <Title order={3}>{selectedApiId ? analyticsData.totalExecutions : overallAnalytics.totalExecutions}</Title>
              </Card>
            </Grid.Col>
            
            <Grid.Col xs={12} sm={6} md={3}>
              <Card p="lg" withBorder sx={{ height: 120 }}>
                <Text size="sm" color="dimmed" mb="xs">Success Rate</Text>
                <Group>
                  <Title order={3}>
                    {selectedApiId 
                      ? analyticsData.successRate.toFixed(1) 
                      : overallAnalytics.successRate.toFixed(1)}%
                  </Title>
                  <RingProgress
                    size={40}
                    thickness={4}
                    sections={[
                      { 
                        value: selectedApiId 
                          ? analyticsData.successRate 
                          : overallAnalytics.successRate, 
                        color: theme.colors.green[6] 
                      }
                    ]}
                  />
                </Group>
              </Card>
            </Grid.Col>
            
            <Grid.Col xs={12} sm={6} md={3}>
              <Card p="lg" withBorder sx={{ height: 120 }}>
                <Text size="sm" color="dimmed" mb="xs">Error Rate</Text>
                <Group>
                  <Title order={3}>
                    {selectedApiId 
                      ? (100 - analyticsData.successRate).toFixed(1)
                      : (100 - overallAnalytics.successRate).toFixed(1)}%
                  </Title>
                  <Badge
                    color={(selectedApiId 
                      ? 100 - analyticsData.successRate 
                      : 100 - overallAnalytics.successRate) < 10
                      ? 'green' : (selectedApiId 
                      ? 100 - analyticsData.successRate 
                      : 100 - overallAnalytics.successRate) < 25
                      ? 'yellow' : 'red'
                  }
                    variant="filled"
                  >
                    {(selectedApiId 
                      ? 100 - analyticsData.successRate 
                      : 100 - overallAnalytics.successRate) < 10
                      ? 'LOW' : (selectedApiId 
                      ? 100 - analyticsData.successRate 
                      : 100 - overallAnalytics.successRate) < 25
                      ? 'MEDIUM' : 'HIGH'
                    }
                  </Badge>
                </Group>
              </Card>
            </Grid.Col>
            
            <Grid.Col xs={12} sm={6} md={3}>
              <Card p="lg" withBorder sx={{ height: 120 }}>
                <Text size="sm" color="dimmed" mb="xs">Estimated Uptime</Text>
                <Group>
                  <Title order={3}>
                    {selectedApiId
                      ? analyticsData.uptime.toFixed(1)
                      : overallAnalytics.uptime.toFixed(1)}%
                  </Title>
                  <RingProgress
                    size={40}
                    thickness={4}
                    sections={[
                      { 
                        value: selectedApiId
                          ? analyticsData.uptime
                          : overallAnalytics.uptime, 
                        color: (selectedApiId ? analyticsData.uptime : overallAnalytics.uptime) > 99
                          ? theme.colors.green[7]
                          : (selectedApiId ? analyticsData.uptime : overallAnalytics.uptime) > 95
                            ? theme.colors.yellow[7]
                            : theme.colors.red[7]
                      }
                    ]}
                  />
                </Group>
              </Card>
            </Grid.Col>
            
            <Grid.Col xs={12} sm={6} md={3}>
              <Card p="lg" withBorder sx={{ height: 120 }}>
                <Text size="sm" color="dimmed" mb="xs">Last Execution</Text>
                <Text size="md">
                  {selectedApiId 
                    ? analyticsData.lastExecutionTime 
                      ? formatDateTime(analyticsData.lastExecutionTime) 
                      : 'Never'
                    : overallAnalytics.lastExecutionTime 
                      ? formatDateTime(overallAnalytics.lastExecutionTime) 
                      : 'Never'
                  }
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
          
          <Grid>
            {/* Status Distribution Chart */}
            <Grid.Col xs={12} md={6}>
              <Paper p="md" withBorder>
                <Title order={4} mb="md">Status Code Distribution</Title>
                {selectedApiId && statusCounts ? (
                  <div style={{ height: 300 }}>
                    {getStatusPieData() && (
                      <Pie 
                        data={getStatusPieData() || {labels: [], datasets: []}} 
                        options={chartOptions} 
                      />
                    )}
                  </div>
                ) : (
                  <Text color="dimmed" size="sm" align="center">
                    Select an API to view status code distribution
                  </Text>
                )}
              </Paper>
            </Grid.Col>
            
            {/* Success vs Failure Chart */}
            <Grid.Col xs={12} md={6}>
              <Paper p="md" withBorder>
                <Title order={4} mb="md">Success vs Failure</Title>
                <div style={{ height: 300 }}>
                  <Bar 
                    data={getSuccessFailureData(selectedApiId ? analyticsData : overallAnalytics)} 
                    options={chartOptions} 
                  />
                </div>
              </Paper>
            </Grid.Col>
          </Grid>
        </>
      )}
    </Container>
  );
} 