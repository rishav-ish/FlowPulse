// Import the Wails-generated models
import { models } from '../../wailsjs/go/models';

// Re-export the models
export type API = models.API;
export type Schedule = models.Schedule;
export type ExecutionLog = models.ExecutionLog;

// Base types for forms
export interface BaseAPI {
  name: string;
  method: string;
  url: string;
  headers: string;
  body: string;
  description: string;
}

export interface BaseSchedule {
  apiId: number;
  type: string;
  expression: string;
  isActive: boolean;
  retryCount: number;
  fallbackDelay: number;
}

// Constants
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
export type HTTPMethod = typeof HTTP_METHODS[number];

export const SCHEDULE_TYPES = ['cron', 'interval'] as const;
export type ScheduleType = typeof SCHEDULE_TYPES[number];

export const SCHEDULE_STATUS = ['active', 'inactive', 'completed'] as const;
export type ScheduleStatus = typeof SCHEDULE_STATUS[number];

// Utility function to format date time
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

// Format status code with text
export function formatStatusCode(code: number): string {
  if (code >= 200 && code < 300) return `${code} OK`;
  if (code >= 300 && code < 400) return `${code} Redirect`;
  if (code >= 400 && code < 500) return `${code} Client Error`;
  if (code >= 500) return `${code} Server Error`;
  return `${code} Unknown`;
}

export const DEFAULT_HEADERS = JSON.stringify({
  'Content-Type': 'application/json',
}, null, 2);

// Declare global window interface
declare global {
  interface Window {
    go: {
      main: {
        App: {
          // API methods
          GetAllAPIs(): Promise<API[]>;
          GetAPIByID(id: number): Promise<API>;
          CreateAPI(api: API): Promise<API>;
          UpdateAPI(api: API): Promise<API>;
          DeleteAPI(id: number): Promise<void>;
          
          // Schedule methods
          GetAllSchedules(): Promise<Schedule[]>;
          GetSchedulesByAPIID(apiId: number): Promise<Schedule[]>;
          CreateSchedule(schedule: Schedule): Promise<Schedule>;
          UpdateSchedule(schedule: Schedule): Promise<void>;
          DeleteSchedule(id: number): Promise<void>;
          ToggleSchedule(id: number, isActive: boolean): Promise<void>;
          
          // Execution log methods
          GetAllExecutionLogs(page: number, pageSize: number): Promise<ExecutionLog[]>;
          GetExecutionLogsByAPIID(apiId: number, limit: number): Promise<ExecutionLog[]>;
          GetRecentExecutions(limit: number): Promise<ExecutionLog[]>;
          ExecuteAPIManually(id: number): Promise<void>;
        }
      }
    }
  }
} 