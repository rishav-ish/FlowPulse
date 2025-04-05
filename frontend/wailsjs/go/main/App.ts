export function ToggleSchedule(id: number, active: boolean): Promise<void> {
  return window['go']['main']['App']['ToggleSchedule'](id, active);
}

export function CancelSchedule(id: number): Promise<void> {
  return window['go']['main']['App']['CancelSchedule'](id);
} 