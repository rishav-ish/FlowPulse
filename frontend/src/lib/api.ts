// API wrapper functions to handle TypeScript issues
import { API, Schedule, ExecutionLog } from '../types';
import { models } from '../../wailsjs/go/models';
import { callBackend } from './wailsRuntime';

// API Functions
export const GetAllAPIs = async (): Promise<API[]> => {
  return callBackend<API[]>('GetAllAPIs', []);
};

export const GetAPI = async (id: number): Promise<API> => {
  return callBackend<API>('GetAPIByID', [id]);
};

export const CreateAPI = async (api: models.API): Promise<API> => {
  return callBackend<API>('CreateAPI', [api]);
};

export const UpdateAPI = async (api: models.API): Promise<API> => {
  return callBackend<API>('UpdateAPI', [api]);
};

export const DeleteAPI = async (id: number): Promise<void> => {
  return callBackend<void>('DeleteAPI', [id]);
};

export const ExecuteAPIManually = async (id: number): Promise<void> => {
  return callBackend<void>('ExecuteAPIManually', [id]);
};

// Schedule Functions
export const GetAllSchedules = async (): Promise<Schedule[]> => {
  return callBackend<Schedule[]>('GetAllSchedules', []);
};

export const GetSchedulesByAPIID = async (apiId: number): Promise<Schedule[]> => {
  return callBackend<Schedule[]>('GetSchedulesByAPIID', [apiId]);
};

export const CreateSchedule = async (schedule: models.Schedule): Promise<Schedule> => {
  return callBackend<Schedule>('CreateSchedule', [schedule]);
};

export const UpdateSchedule = async (schedule: models.Schedule): Promise<void> => {
  return callBackend<void>('UpdateSchedule', [schedule]);
};

export const DeleteSchedule = async (id: number): Promise<void> => {
  return callBackend<void>('DeleteSchedule', [id]);
};

export const ToggleSchedule = async (id: number, active: boolean): Promise<void> => {
  return callBackend<void>('ToggleSchedule', [id, active]);
};

// Log Functions
export const GetAllExecutionLogs = async (page: number, pageSize: number): Promise<ExecutionLog[]> => {
  return callBackend<ExecutionLog[]>('GetAllExecutionLogs', [page, pageSize]);
};

export const GetExecutionLogsByAPIID = async (apiId: number, limit: number): Promise<ExecutionLog[]> => {
  return callBackend<ExecutionLog[]>('GetExecutionLogsByAPIID', [apiId, limit]);
};

export const GetRecentExecutions = async (limit: number): Promise<ExecutionLog[]> => {
  return callBackend<ExecutionLog[]>('GetRecentExecutions', [limit]);
}; 