import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Navbar,
  Header,
  Text,
  MediaQuery,
  Burger,
  useMantineTheme,
  UnstyledButton,
  Group,
  ThemeIcon,
  Box,
  ActionIcon,
  useMantineColorScheme,
  Title,
  Divider,
  Stack,
  Paper
} from '@mantine/core';
import {
  IconDashboard,
  IconApi,
  IconCalendarEvent,
  IconClipboardList,
  IconMoonStars,
  IconSun,
  IconSettings,
  IconLogout,
  IconBrandGithub
} from '@tabler/icons-react';
import './App.css';

interface NavLinkProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?(): void;
}

function NavLink({ icon, label, active, onClick }: NavLinkProps) {
  const theme = useMantineTheme();
  
  return (
    <UnstyledButton
      onClick={onClick}
      sx={(theme) => ({
        display: 'block',
        width: '100%',
        padding: theme.spacing.xs,
        borderRadius: theme.radius.sm,
        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
        backgroundColor: active
          ? theme.colorScheme === 'dark'
            ? theme.colors.dark[6]
            : theme.colors.blue[0]
          : 'transparent',
        '&:hover': {
          backgroundColor:
            theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        },
      })}
    >
      <Group>
        <ThemeIcon variant={active ? "filled" : "light"} color={active ? "blue" : "gray"} size={30}>
          {icon}
        </ThemeIcon>

        <Text weight={active ? 600 : 400} size="sm">
          {label}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

export default function App() {
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  // Debug the Wails runtime connection
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        // Check if window.go exists
        if (typeof window.go === 'undefined') {
          setBackendConnected(false);
          setErrorDetails('window.go is undefined');
          return;
        }

        // Try to access the App namespace
        if (typeof window.go.main === 'undefined' || typeof window.go.main.App === 'undefined') {
          setBackendConnected(false);
          setErrorDetails('window.go.main.App is undefined');
          return;
        }

        // Try to call a backend method
        try {
          const apis = await window.go.main.App.GetAllAPIs();
          // Even if APIs is null, we consider the connection successful if no error was thrown
          setBackendConnected(true);
          console.log('Backend connection successful, APIs:', apis || []);
        } catch (error) {
          setBackendConnected(false);
          setErrorDetails(`Backend call failed: ${error}`);
        }
      } catch (error) {
        setBackendConnected(false);
        setErrorDetails(`Unexpected error: ${error}`);
      }
    };

    checkBackendConnection();
  }, []);
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  const links = [
    { icon: <IconDashboard size={18} />, label: 'Dashboard', path: '/' },
    { icon: <IconApi size={18} />, label: 'APIs', path: '/apis' },
    { icon: <IconCalendarEvent size={18} />, label: 'Schedules', path: '/schedules' },
    { icon: <IconClipboardList size={18} />, label: 'Execution Logs', path: '/logs' },
  ];

  return (
    <AppShell
      styles={{
        main: {
          background: 'transparent',
          backdropFilter: 'blur(10px)',
        },
        root: {
          // Ensure the root element doesn't have a background color that overlays everything
          background: 'transparent',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      navbarOffsetBreakpoint="sm"
      navbar={
        <Navbar
          p="md"
          hiddenBreakpoint="sm"
          hidden={!opened}
          width={{ sm: 250, lg: 300 }}
        >
          {/* Debug info at the top of navbar */}
          {backendConnected === false && (
            <Navbar.Section>
              <Paper p="xs" mb="md" bg="red" c="white">
                <Text size="xs" weight={500}>Backend Connection Failed</Text>
                <Text size="xs">{errorDetails}</Text>
              </Paper>
            </Navbar.Section>
          )}
          
          <Navbar.Section grow>
            <Stack spacing="xs">
              {links.map((link) => (
                <NavLink
                  key={link.path}
                  icon={link.icon}
                  label={link.label}
                  active={isActive(link.path)}
                  onClick={() => {
                    navigate(link.path);
                    setOpened(false);
                  }}
                />
              ))}
            </Stack>
          </Navbar.Section>
          
          <Divider my="sm" />
          
          <Navbar.Section>
            <Group position="center" my="md">
              <ActionIcon
                variant="default"
                onClick={() => toggleColorScheme()}
                size={30}
              >
                {dark ? <IconSun size={16} /> : <IconMoonStars size={16} />}
              </ActionIcon>
              
              <ActionIcon
                component="a"
                href="https://github.com/user/flowpulse"
                target="_blank"
                variant="default"
                size={30}
              >
                <IconBrandGithub size={16} />
              </ActionIcon>
            </Group>
          </Navbar.Section>
        </Navbar>
      }
      header={
        <Header height={60} p="md">
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'space-between' }}>
            <Group>
              <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
                <Burger
                  opened={opened}
                  onClick={() => setOpened((o) => !o)}
                  size="sm"
                  color={theme.colors.gray[6]}
                  mr="xl"
                />
              </MediaQuery>
              
              <Group spacing="xs">
                <ThemeIcon size={30} radius="xl" variant="filled" color="blue">
                  <IconApi size={18} />
                </ThemeIcon>
                <Title order={3}>FlowPulse</Title>
              </Group>
            </Group>
            
            <Text color="dimmed" size="sm">API Scheduler and Monitoring</Text>
          </div>
        </Header>
      }
    >
      <Outlet />
    </AppShell>
  );
}
