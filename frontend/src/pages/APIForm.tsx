import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Title, TextInput, Select, Textarea,
  Button, Group, Paper, Box, Tabs, Text,
  LoadingOverlay, Alert, Code, Badge, Grid,
  Divider, ActionIcon, Tooltip, Card, JsonInput,
  Switch, Collapse, Accordion, useMantineTheme, Stack
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { 
  IconAlertCircle, IconCheck, IconDeviceFloppy, 
  IconArrowLeft, IconCode, IconWorld, 
  IconBrandChrome, IconSettingsAutomation, 
  IconLayoutGridAdd, IconInfoCircle, IconRefresh,
  IconSend, IconCornerDownRight, IconPlus
} from '@tabler/icons-react';
import { API, BaseAPI, HTTP_METHODS, HTTPMethod, DEFAULT_HEADERS, Collection } from '../types';
import { GetAPIByID, CreateAPI, UpdateAPI, GetAllCollections } from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';

const MethodBadge = ({ method }: { method: string }) => {
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'blue';
      case 'POST': return 'green';
      case 'PUT': return 'yellow';
      case 'DELETE': return 'red';
      case 'PATCH': return 'indigo';
      default: return 'gray';
    }
  };

  return (
    <Badge 
      color={getMethodColor(method)} 
      size="lg" 
      radius="sm" 
      sx={{ fontWeight: 600, width: '80px', textAlign: 'center' }}
    >
      {method}
    </Badge>
  );
};

export function APIForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('general');
  const [success, setSuccess] = useState<string | null>(null);
  const theme = useMantineTheme();
  const isEditMode = !!id;
  const [collections, setCollections] = useState<Collection[]>([]);

  const form = useForm<BaseAPI>({
    initialValues: {
      name: '',
      method: 'GET',
      url: '',
      headers: DEFAULT_HEADERS,
      body: '',
      description: '',
      collectionId: 0,
    },
    validate: {
      name: (value) => (value ? null : 'Name is required'),
      url: (value) => (value ? null : 'URL is required'),
      method: (value) => (value ? null : 'Method is required'),
      headers: (value) => {
        try {
          if (value) JSON.parse(value);
          return null;
        } catch {
          return 'Invalid JSON format';
        }
      }
    }
  });

  useEffect(() => {
    if (isEditMode && id) {
      loadAPI(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    const loadCollections = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const collectionsData = await GetAllCollections();
        setCollections(collectionsData || []);
      } catch (err) {
        console.error('Failed to load collections:', err);
        setError('Failed to load collections. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadCollections();
  }, []);

  const loadAPI = async (apiId: number) => {
    setLoading(true);
    setError(null);

    try {
      const api = await GetAPIByID(apiId);
      form.setValues({
        name: api.name,
        method: api.method,
        url: api.url,
        headers: api.headers,
        body: api.body,
        description: api.description,
        collectionId: api.collectionId || 0,
      });
    } catch (err) {
      setError('Failed to load API details. Please try again.');
      console.error('Error loading API:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: BaseAPI) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let headersStr = values.headers;
      
      // Validate headers if provided
      if (headersStr.trim()) {
        try {
          JSON.parse(headersStr);
        } catch (err) {
          setError('Headers must be valid JSON');
          setLoading(false);
          return;
        }
      }
      
      if (isEditMode && id) {
        const apiModel = new models.API({
          id: parseInt(id),
          ...values,
          collectionId: values.collectionId || 0,
          createdAt: new Date().toISOString(), // This will be ignored by the backend
          updatedAt: new Date().toISOString(),
        });
        await UpdateAPI(apiModel);
        setSuccess('API updated successfully');
      } else {
        const apiModel = new models.API(values);
        await CreateAPI(apiModel);
        setSuccess('API created successfully');
      }
      
      // Navigate after a brief delay to show success message
      setTimeout(() => {
        navigate('/apis');
      }, 1500);
    } catch (err) {
      setError('Failed to save API. Please try again.');
      console.error('Error saving API:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" px="lg">
      <Paper p="lg" radius="md" withBorder shadow="sm" style={{ background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white }}>
        <LoadingOverlay visible={loading} overlayBlur={2} />
        
        <Group position="apart" mb="xl">
          <Group>
            <IconBrandChrome size={24} stroke={1.5} color={theme.colors.blue[5]} />
            <Title order={3}>{isEditMode ? 'Edit API Endpoint' : 'Create New API Endpoint'}</Title>
          </Group>
          
          <Button
            variant="subtle"
            leftIcon={<IconArrowLeft size={16} />}
            onClick={() => navigate('/apis')}
          >
            Back to APIs
          </Button>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} color="green" mb="md" withCloseButton onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          {/* Main content area - Postman style */}
          <Card shadow="sm" radius="md" withBorder mb="md" p={0}>
            {/* Name input as title */}
            <Card.Section p="md" bg={theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]}>
              <TextInput
                placeholder="API Name"
                required
                size="md"
                icon={<IconSettingsAutomation size={16} />}
                styles={{
                  input: {
                    fontWeight: 500,
                    fontSize: '1rem',
                    border: 'none',
                    background: 'transparent',
                    '&:focus': {
                      border: 'none',
                      outline: 'none'
                    }
                  }
                }}
                {...form.getInputProps('name')}
              />
            </Card.Section>
            
            {/* URL Bar - Postman style */}
            <Card.Section p="md" bg={theme.colorScheme === 'dark' ? theme.colors.dark[8] : '#f5f5f5'}>
              <Group spacing={0} align="flex-start" noWrap>
                {/* Method selector */}
                <Select
                  data={HTTP_METHODS}
                  required
                  value={form.values.method}
                  onChange={(value) => form.setFieldValue('method', value || 'GET')}
                  sx={{
                    width: '110px',
                    marginRight: '-1px',
                    'select': {
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      fontWeight: 600,
                      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
                    }
                  }}
                  styles={(theme) => ({
                    item: {
                      '&[data-selected]': {
                        '&[data-value="GET"]': { backgroundColor: theme.colors.blue[6] },
                        '&[data-value="POST"]': { backgroundColor: theme.colors.green[6] },
                        '&[data-value="PUT"]': { backgroundColor: theme.colors.yellow[6] },
                        '&[data-value="DELETE"]': { backgroundColor: theme.colors.red[6] },
                        '&[data-value="PATCH"]': { backgroundColor: theme.colors.indigo[6] }
                      }
                    },
                    input: {
                      fontWeight: 600
                    }
                  })}
                  rightSection={null}
                />
                
                {/* URL input */}
                <TextInput
                  placeholder="https://api.example.com/endpoint"
                  required
                  sx={{
                    flex: 1,
                    'input': {
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      fontFamily: 'monospace',
                    }
                  }}
                  {...form.getInputProps('url')}
                />
                
                <Button 
                  ml="md"
                  leftIcon={<IconSend size={16} />}
                  type="submit"
                  sx={{ minWidth: '120px' }}
                >
                  {isEditMode ? 'Update' : 'Save'}
                </Button>
              </Group>
            </Card.Section>
            
            {/* Tabs and content */}
            <Card.Section>
              <Tabs 
                value={activeTab} 
                onTabChange={setActiveTab} 
                styles={{
                  tab: {
                    fontWeight: 500,
                    paddingLeft: theme.spacing.lg,
                    paddingRight: theme.spacing.lg,
                    height: '45px'
                  },
                  tabsList: {
                    borderBottom: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`,
                  }
                }}
              >
                <Tabs.List>
                  <Tabs.Tab value="general" icon={<IconInfoCircle size={16} />}>Overview</Tabs.Tab>
                  <Tabs.Tab value="params" icon={<IconPlus size={16} />}>Params</Tabs.Tab>
                  <Tabs.Tab value="headers" icon={<IconCornerDownRight size={16} />}>Headers</Tabs.Tab>
                  <Tabs.Tab value="body" icon={<IconCode size={16} />}>Body</Tabs.Tab>
                  <Tabs.Tab value="documentation" icon={<IconLayoutGridAdd size={16} />}>Docs</Tabs.Tab>
                </Tabs.List>

                <Box p="lg">
                  <Tabs.Panel value="general" pt="md">
                    <Text size="sm" weight={500} color="dimmed" mb="md">General information about this API endpoint</Text>
                    
                    <Grid>
                      <Grid.Col span={12}>
                        <Box mb="md">
                          <Text size="sm" weight={500} mb={5}>Request Summary</Text>
                          <Group spacing="xs">
                            <MethodBadge method={form.values.method} />
                            <Text size="sm" color="dimmed" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {form.values.url || 'https://api.example.com/endpoint'}
                            </Text>
                          </Group>
                        </Box>
                      </Grid.Col>
                      
                      <Grid.Col span={12}>
                        <Textarea
                          label="Description"
                          placeholder="Describe what this API endpoint does, expected responses, and other details"
                          autosize
                          minRows={4}
                          maxRows={6}
                          {...form.getInputProps('description')}
                        />
                      </Grid.Col>
                    </Grid>
                  </Tabs.Panel>

                  <Tabs.Panel value="params" pt="md">
                    <Text size="sm" weight={500} color="dimmed" mb="md">Query parameters for the request URL</Text>
                    <Alert icon={<IconInfoCircle size={16} />} color="blue">
                      Add query parameters directly to your URL (e.g., https://api.example.com/endpoint?param=value)
                    </Alert>
                  </Tabs.Panel>

                  <Tabs.Panel value="headers" pt="md">
                    <Text size="sm" weight={500} color="dimmed" mb="md">HTTP headers to include with your request</Text>
                    
                    <JsonInput
                      placeholder='{ "Content-Type": "application/json" }'
                      validationError="Invalid JSON format"
                      formatOnBlur
                      autosize
                      minRows={8}
                      maxRows={12}
                      styles={{
                        root: { overflow: 'visible' },
                        input: { 
                          fontFamily: 'monospace',
                          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
                        }
                      }}
                      {...form.getInputProps('headers')}
                    />
                  </Tabs.Panel>

                  <Tabs.Panel value="body" pt="md">
                    <Text size="sm" weight={500} color="dimmed" mb="md">Request body to send with your API call</Text>
                    
                    <Group position="apart" mb="sm">
                      <Badge>JSON</Badge>
                      <Text size="xs" color="dimmed">Raw Body</Text>
                    </Group>
                    
                    <Textarea
                      placeholder="Enter request body"
                      autosize
                      minRows={10}
                      maxRows={15}
                      styles={{
                        input: { 
                          fontFamily: 'monospace',
                          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
                        }
                      }}
                      {...form.getInputProps('body')}
                    />
                  </Tabs.Panel>

                  <Tabs.Panel value="documentation" pt="md">
                    <Text size="sm" weight={500} color="dimmed" mb="md">Documentation for this API endpoint</Text>
                    
                    <Textarea
                      label="Detailed documentation"
                      placeholder="Include comprehensive documentation about this API, its parameters, responses, and examples"
                      autosize
                      minRows={10}
                      maxRows={15}
                      {...form.getInputProps('description')}
                    />
                  </Tabs.Panel>
                </Box>
              </Tabs>
            </Card.Section>
          </Card>

          <Stack spacing="md" mt="xl">
            <Select
              label="Collection"
              placeholder="Select a collection (optional)"
              value={form.values.collectionId.toString()}
              onChange={(value) => form.setFieldValue('collectionId', value ? parseInt(value) : 0)}
              data={[
                { value: '0', label: 'No Collection' },
                ...collections.map(c => ({ value: c.id.toString(), label: c.name }))
              ]}
              clearable
            />

            <Group position="right">
              <Button 
                variant="default"
                leftIcon={<IconRefresh size={16} />}
                onClick={() => form.reset()}
                disabled={loading}
              >
                Reset
              </Button>
              
              <Button
                type="submit"
                leftIcon={<IconDeviceFloppy size={16} />}
                loading={loading}
              >
                {isEditMode ? 'Update API' : 'Create API'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
} 