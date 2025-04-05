import React, { useEffect, useState } from 'react'
import {createRoot} from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { MantineProvider, ColorSchemeProvider, ColorScheme, Loader, Text, Center, Stack, Button } from '@mantine/core'
import App from './App'
import { Dashboard } from './pages/Dashboard'
import { APIList } from './pages/APIList'
import { APIForm } from './pages/APIForm'
import { ScheduleList } from './pages/ScheduleList'
import { ScheduleForm } from './pages/ScheduleForm'
import { LogViewer } from './pages/LogViewer'
import { AppDebug } from './AppDebug'
import { waitForWailsRuntime, getWailsRuntimeStatus } from './lib/wailsRuntime'
import './style.css'
import './global.css'

// Use debug mode for troubleshooting
const useDebugMode = false;

// Initialize DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, initializing application");
    
    const container = document.getElementById('root')
    if (!container) {
        console.error('No root container found')
        return
    }
    
    const root = createRoot(container)
    
    if (useDebugMode) {
        console.log("Using debug mode")
        root.render(
            <MantineProvider theme={{ colorScheme: 'light', primaryColor: 'blue' }} withGlobalStyles withNormalizeCSS>
                <AppDebug />
            </MantineProvider>
        )
        return
    }
    
    root.render(
        <React.StrictMode>
            <Main />
        </React.StrictMode>
    )
})

function Main() {
    const [colorScheme, setColorScheme] = useState<ColorScheme>('light')
    const [runtimeReady, setRuntimeReady] = useState<boolean | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [debugMode, setDebugMode] = useState(false)
    
    const toggleColorScheme = (value?: ColorScheme) =>
        setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'))
    
    useEffect(() => {
        // Initialize Wails runtime
        async function initRuntime() {
            try {
                console.log('Waiting for Wails runtime to initialize...')
                const ready = await waitForWailsRuntime(10000)
                setRuntimeReady(ready)
                
                if (!ready) {
                    const status = getWailsRuntimeStatus()
                    setError(`Failed to initialize Wails runtime: ${status.details}`)
                    console.error('Wails runtime initialization failed:', status.details)
                } else {
                    console.log('Wails runtime initialized successfully')
                }
            } catch (err) {
                setError(`Error initializing Wails runtime: ${err}`)
                console.error('Error initializing Wails runtime:', err)
            }
        }
        
        initRuntime()
    }, [])
    
    // If debug mode is enabled, show the debug component
    if (debugMode) {
        return (
            <MantineProvider theme={{ colorScheme: 'light', primaryColor: 'blue' }} withGlobalStyles withNormalizeCSS>
                <AppDebug />
            </MantineProvider>
        )
    }
    
    // Show loading state while waiting for runtime
    if (runtimeReady === null) {
        return (
            <MantineProvider theme={{ colorScheme: 'light', primaryColor: 'blue' }} withGlobalStyles withNormalizeCSS>
                <Center style={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, background: 'transparent' }}>
                    <Stack align="center" spacing="md">
                        <Loader size="lg" color="blue" />
                        <Text>Initializing FlowPulse...</Text>
                        <Button 
                            variant="light" 
                            onClick={() => setDebugMode(true)} 
                            size="xs" 
                            mt="md"
                        >
                            Switch to Debug Mode
                        </Button>
                    </Stack>
                </Center>
            </MantineProvider>
        )
    }
    
    // Show error if runtime failed to initialize
    if (runtimeReady === false) {
        return (
            <MantineProvider theme={{ colorScheme: 'light', primaryColor: 'blue' }} withGlobalStyles withNormalizeCSS>
                <Center style={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, background: 'transparent' }}>
                    <Stack align="center" spacing="md" p="md" style={{ maxWidth: '600px', textAlign: 'center' }}>
                        <Text color="red" size="xl">Application Initialization Failed</Text>
                        <Text>{error || 'Failed to connect to the backend. Please restart the application.'}</Text>
                        <Text size="sm" mb="md">
                            This is typically caused by the backend not being available or a communication issue.
                            Try restarting the application or use debug mode to diagnose the issue.
                        </Text>
                        <Button onClick={() => setDebugMode(true)}>
                            Switch to Debug Mode
                        </Button>
                    </Stack>
                </Center>
            </MantineProvider>
        )
    }

    return (
        <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
            <MantineProvider 
                theme={{ 
                    colorScheme, 
                    primaryColor: 'blue',
                    components: {
                        AppShell: {
                            styles: {
                                root: {
                                    backgroundColor: 'transparent'
                                },
                                main: {
                                    backgroundColor: 'transparent'
                                }
                            }
                        },
                        Paper: {
                            styles: (theme) => ({
                                root: {
                                    backgroundColor: colorScheme === 'dark' ? 
                                        theme.colors.dark[7] : 
                                        'rgba(255, 255, 255, 0.85)'
                                }
                            })
                        }
                    }
                }} 
                withGlobalStyles 
                withNormalizeCSS
            >
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<App />}>
                            <Route index element={<Dashboard />} />
                            <Route path="apis" element={<APIList />} />
                            <Route path="apis/new" element={<APIForm />} />
                            <Route path="apis/:id/edit" element={<APIForm />} />
                            <Route path="schedules" element={<ScheduleList />} />
                            <Route path="schedules/new" element={<ScheduleForm />} />
                            <Route path="schedules/edit/:id" element={<ScheduleForm />} />
                            <Route path="logs" element={<LogViewer />} />
                            <Route path="debug" element={<AppDebug />} />
                        </Route>
                    </Routes>
                </HashRouter>
            </MantineProvider>
        </ColorSchemeProvider>
    )
}
