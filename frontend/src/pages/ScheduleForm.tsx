import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Title, TextInput, Select, NumberInput,
  Button, Group, Paper, Box, Tabs, Text,
  LoadingOverlay, Alert, Switch, Radio, Code,
  useMantineTheme
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { 
  IconAlertCircle, IconDeviceFloppy, 
  IconArrowLeft, IconClock 
} from '@tabler/icons-react';
import { Schedule, API, BaseSchedule, SCHEDULE_TYPES } from '../types';
import { 
  GetAllSchedules, CreateSchedule, UpdateSchedule, 
  GetAllAPIs, GetAPIByID, GetSchedulesByAPIID 
} from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';

export function ScheduleForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const apiId = searchParams.get('apiId');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('schedule');
  const [apis, setApis] = useState<API[]>([]);
  const [scheduleType, setScheduleType] = useState<'cron' | 'interval'>('cron');
  const isEditMode = !!id;
  const theme = useMantineTheme();

  const form = useForm<BaseSchedule>({
    initialValues: {
      apiId: apiId ? parseInt(apiId) : 0,
      type: 'cron',
      expression: '0 * * * *', // Default to run every hour
      isActive: true,
      retryCount: 0,
      fallbackDelay: 0
    },
    validate: {
      apiId: (value) => (value > 0 ? null : 'API is required'),
      expression: (value, values) => 
        scheduleType === 'cron' && !value ? 'Cron expression is required' : null,
      type: (value) => (value ? null : 'Type is required')
    }
  });

  useEffect(() => {
    loadAPIs();
    if (isEditMode && id) {
      loadSchedule(parseInt(id));
    } else if (apiId) {
      loadAPIDetails(parseInt(apiId));
    }
  }, [id, apiId]);

  const loadAPIs = async () => {
    try {
      const result = await GetAllAPIs();
      setApis(result || []);
    } catch (err) {
      console.error('Failed to load APIs:', err);
    }
  };

  const loadAPIDetails = async (apiId: number) => {
    try {
      const api = await GetAPIByID(apiId);
      form.setFieldValue('apiId', api.id);
    } catch (err) {
      console.error('Failed to load API details:', err);
    }
  };

  const loadSchedule = async (scheduleId: number) => {
    setLoading(true);
    setError(null);

    try {
      const schedules = await GetSchedulesByAPIID(scheduleId);
      if (schedules.length > 0) {
        const schedule = schedules[0];
        form.setValues({
          apiId: schedule.apiId,
          type: schedule.type,
          expression: schedule.expression,
          isActive: schedule.isActive,
          retryCount: schedule.retryCount,
          fallbackDelay: schedule.fallbackDelay
        });
        
        // Determine schedule type
        setScheduleType(schedule.type as 'cron' | 'interval');
      } else {
        setError('Schedule not found');
      }
    } catch (err) {
      setError('Failed to load schedule details. Please try again.');
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: BaseSchedule) => {
    setLoading(true);
    setError(null);

    try {
      if (isEditMode && id) {
        const scheduleModel = new models.Schedule({
          id: parseInt(id),
          ...values
        });
        await UpdateSchedule(scheduleModel);
      } else {
        const scheduleModel = new models.Schedule(values);
        await CreateSchedule(scheduleModel);
      }
      navigate('/schedules');
    } catch (err) {
      setError('Failed to save schedule. Please check your input and try again.');
      console.error('Error saving schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const cronExamples = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at midnight', value: '0 0 * * *' },
    { label: 'Every Monday at 9am', value: '0 9 * * 1' },
    { label: 'Every 1st of month', value: '0 0 1 * *' }
  ];

  return (
    <Container size="md" p="md">
      <Box pos="relative" mb="xl">
        <LoadingOverlay visible={loading} overlayBlur={2} />
        
        <Group position="apart" mb="md">
          <Title order={2}>{isEditMode ? 'Edit Schedule' : 'Create Schedule'}</Title>
          <Button 
            variant="light" 
            leftIcon={<IconArrowLeft size={16} />}
            onClick={() => navigate('/schedules')}
          >
            Back to Schedules
          </Button>
        </Group>

        {error && (
          <Alert 
            icon={<IconAlertCircle size={16} />} 
            title="Error" 
            color="red" 
            mb="md"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
        
        <Paper shadow="xs" p="md" withBorder>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Tabs value={activeTab} onTabChange={setActiveTab} mb="md">
              <Tabs.List>
                <Tabs.Tab value="schedule">Schedule</Tabs.Tab>
                <Tabs.Tab value="advanced">Advanced</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="schedule" pt="md">
                <Select
                  label="API"
                  placeholder="Select API to schedule"
                  data={apis.map(api => ({ value: api.id.toString(), label: api.name }))}
                  required
                  mb="md"
                  value={form.values.apiId.toString()}
                  onChange={(value) => form.setFieldValue('apiId', parseInt(value || '0'))}
                />
                
                <Radio.Group
                  label="Schedule Type"
                  value={scheduleType}
                  onChange={(value) => {
                    setScheduleType(value as 'cron' | 'interval');
                    form.setFieldValue('type', value);
                  }}
                  mb="md"
                >
                  <Group mt="xs">
                    <Radio value="cron" label="Cron Expression" />
                    <Radio value="interval" label="Time Interval" />
                  </Group>
                </Radio.Group>
                
                {scheduleType === 'cron' ? (
                  <Box mb="md">
                    <TextInput
                      label="Cron Expression"
                      placeholder="* * * * *"
                      required
                      mb="xs"
                      {...form.getInputProps('expression')}
                    />
                    <Text size="xs" color="dimmed" mb="xs">
                      Format: minute hour day-of-month month day-of-week
                    </Text>
                    <Text size="xs" weight={500} mb="xs">Examples:</Text>
                    <Box p="xs" style={{ backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0] }}>
                      {cronExamples.map((example, index) => (
                        <Group key={index} mb={5} position="apart">
                          <Text size="xs">{example.label}</Text>
                          <Button 
                            variant="subtle" 
                            size="xs" 
                            compact
                            onClick={() => form.setFieldValue('expression', example.value)}
                          >
                            {example.value}
                          </Button>
                        </Group>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <NumberInput
                    label="Interval (seconds)"
                    placeholder="Enter interval in seconds"
                    required
                    min={1}
                    mb="md"
                    value={parseInt(form.values.expression) || 3600}
                    onChange={(value) => form.setFieldValue('expression', value?.toString() || '3600')}
                  />
                )}
                
                <Switch
                  label="Active"
                  checked={form.values.isActive}
                  onChange={(event) => form.setFieldValue('isActive', event.currentTarget.checked)}
                  mb="md"
                />
              </Tabs.Panel>
              
              <Tabs.Panel value="advanced" pt="md">
                <NumberInput
                  label="Retry Count"
                  description="Number of times to retry on failure"
                  min={0}
                  max={10}
                  mb="md"
                  {...form.getInputProps('retryCount')}
                />
                
                <NumberInput
                  label="Fallback Delay (seconds)"
                  description="Time to wait between retries"
                  min={0}
                  max={3600}
                  mb="md"
                  {...form.getInputProps('fallbackDelay')}
                />
              </Tabs.Panel>
            </Tabs>
            
            <Group position="right" mt="xl">
              <Button
                type="submit"
                leftIcon={<IconDeviceFloppy size={16} />}
              >
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </Group>
          </form>
        </Paper>
      </Box>
    </Container>
  );
} 