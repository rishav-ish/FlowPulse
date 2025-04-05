/**
 * Helper functions for ensuring proper Wails runtime initialization
 */

// Wait for the Wails runtime to be ready
export async function waitForWailsRuntime(timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    // If already available, resolve immediately
    if (isRuntimeAvailable()) {
      console.log("Wails runtime already available");
      resolve(true);
      return;
    }

    console.log("Waiting for Wails runtime...");
    
    let elapsed = 0;
    const checkInterval = 100; // ms

    // Check every 100ms
    const intervalId = setInterval(() => {
      elapsed += checkInterval;
      
      // Log status every second
      if (elapsed % 1000 === 0) {
        console.log(`Still waiting for Wails runtime... (${elapsed/1000}s)`);
        console.log("Window.go status:", typeof window.go !== 'undefined' ? 'Available' : 'Not available');
      }
      
      if (isRuntimeAvailable()) {
        clearInterval(intervalId);
        console.log("Wails runtime initialized after", elapsed, "ms");
        resolve(true);
        return;
      }
      
      // Timeout after specified duration
      if (elapsed >= timeout) {
        clearInterval(intervalId);
        console.error(`Wails runtime initialization timed out after ${timeout}ms`);
        resolve(false);
      }
    }, checkInterval);
  });
}

// Helper to check if runtime is available
function isRuntimeAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.go === 'undefined') return false;
  if (typeof window.go.main === 'undefined') return false;
  if (typeof window.go.main.App === 'undefined') return false;
  
  // Check if at least one function exists
  const app = window.go.main.App;
  return typeof app.GetAllAPIs === 'function';
}

// Get detailed runtime status information
export function getWailsRuntimeStatus(): { 
  available: boolean;
  goExists: boolean;
  mainExists: boolean;
  appExists: boolean;
  funcExists: boolean;
  details: string;
} {
  const goExists = typeof window !== 'undefined' && typeof window.go !== 'undefined';
  const mainExists = goExists && typeof window.go.main !== 'undefined';
  const appExists = mainExists && typeof window.go.main.App !== 'undefined';
  const funcExists = appExists && typeof window.go.main.App.GetAllAPIs === 'function';
  
  return {
    available: funcExists,
    goExists,
    mainExists,
    appExists,
    funcExists,
    details: `window.go: ${goExists}, window.go.main: ${mainExists}, window.go.main.App: ${appExists}, functions: ${funcExists}`
  };
}

// Call a Wails backend function with proper error handling
export async function callBackend<T>(
  functionName: string, 
  args: any[] = []
): Promise<T> {
  // Make sure window exists (for SSR compatibility)
  if (typeof window === 'undefined') {
    throw new Error('Window is not defined');
  }
  
  // Wait for runtime with a short timeout
  const runtimeReady = await waitForWailsRuntime(2000);
  if (!runtimeReady) {
    console.warn(`Wails runtime not fully initialized yet, attempting call to ${functionName} anyway`);
  }
  
  // Check if go exists
  if (typeof window.go === 'undefined') {
    throw new Error('Wails backend not available: window.go is undefined');
  }
  
  // Check if main exists
  if (typeof window.go.main === 'undefined') {
    throw new Error('Wails backend not available: window.go.main is undefined');
  }
  
  // Check if App exists
  if (typeof window.go.main.App === 'undefined') {
    throw new Error('Wails backend not available: window.go.main.App is undefined');
  }
  
  // Check if the function exists
  const appFunctions = window.go.main.App;
  const fn = appFunctions[functionName as keyof typeof appFunctions] as unknown as (...args: any[]) => Promise<T>;
  
  if (typeof fn !== 'function') {
    throw new Error(`Function ${functionName} not found in Wails runtime`);
  }
  
  try {
    // Call the function with arguments
    return await fn(...args);
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
} 