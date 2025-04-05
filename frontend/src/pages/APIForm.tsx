import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Title, TextInput, Select, Textarea,
  Button, Group, Paper, Box, Tabs, Text,
  LoadingOverlay, Alert, Code
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconCheck, IconDeviceFloppy, IconArrowLeft, IconCode, IconWorld } from '@tabler/icons-react';
import { API, BaseAPI, HTTP_METHODS, HTTPMethod } from '../types';
import { GetAPIByID, CreateAPI, UpdateAPI } from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';
import { JsonInput } from '@mantine/core';
import { Stepper } from '@mantine/core';

export function APIForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('details');
  const isEditMode = !!id;

  const form = useForm<BaseAPI>({
    initialValues: {
      name: '',
      method: 'GET',
      url: '',
      headers: '',
      body: '',
      description: ''
    },
    validate: {
      name: (value) => (value ? null : 'Name is required'),
      url: (value) => (value ? null : 'URL is required'),
      method: (value) => (value ? null : 'Method is required')
    }
  });

  useEffect(() => {
    if (isEditMode && id) {
      loadAPI(parseInt(id));
    }
  }, [id]);

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
        description: api.description
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

    try {
      if (isEditMode && id) {
        const apiModel = new models.API({
          id: parseInt(id),
          ...values
        });
        await UpdateAPI(apiModel);
      } else {
        const apiModel = new models.API(values);
        await CreateAPI(apiModel);
      }
      navigate('/apis');
    } catch (err) {
      setError('Failed to save API. Please try again.');
      console.error('Error saving API:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md">
      <Paper p="md" withBorder>
        <LoadingOverlay visible={loading} />
        <Group position="apart" mb="md">
          <Title order={2}>{isEditMode ? 'Edit API' : 'Create API'}</Title>
          <Button
            variant="subtle"
            leftIcon={<IconArrowLeft size={16} />}
            onClick={() => navigate('/apis')}
          >
            Back
          </Button>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
            {error}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Name"
            placeholder="Enter API name"
            required
            {...form.getInputProps('name')}
          />

          <Stepper.Step 
            label="Request Configuration" 
            description="URL, method and data"
            icon={<IconCode size={18} />}
            allowStepSelect={!loading && form.values.name.length > 0}
          >
            <Box mt="xl">
              <Select
                label="HTTP Method"
                placeholder="Select HTTP method"
                required
                size="md"
                mb="md"
                data={HTTP_METHODS}
                {...form.getInputProps('method')}
              />
              
              <TextInput
                label="API URL"
                placeholder="https://api.example.com/endpoint"
                description="Full URL for the API endpoint"
                required
                size="md"
                mb="md"
                icon={<IconWorld size={16} />}
                styles={(theme) => ({
                  input: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  },
                  wrapper: {
                    position: 'relative'
                  },
                  description: {
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                    whiteSpace: 'normal',
                    overflow: 'visible'
                  }
                })}
                {...form.getInputProps('url')}
              />
              
              <JsonInput
                label="Headers"
                placeholder="Enter request headers in JSON format"
                validationError="Invalid JSON"
                formatOnBlur
                autosize
                minRows={5}
                maxRows={10}
                mb="md"
                {...form.getInputProps('headers')}
              />
            </Box>
          </Stepper.Step>

          <Textarea
            label="Body"
            placeholder="Enter request body"
            minRows={3}
            mt="md"
            {...form.getInputProps('body')}
          />

          <Textarea
            label="Description"
            placeholder="Enter API description"
            minRows={2}
            mt="md"
            {...form.getInputProps('description')}
          />

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
    </Container>
  );
} 