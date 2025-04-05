// Models representing the Go backend structures

export namespace models {
  export class API {
    id: number = 0;
    name: string = '';
    method: string = 'GET';
    url: string = '';
    headers: string = '';
    body: string = '';
    description: string = '';
    createdAt: string = '';
    updatedAt: string = '';

    constructor(init?: Partial<API>) {
      Object.assign(this, init);
    }
  }

  export class Schedule {
    id: number = 0;
    apiId: number = 0;
    type: string = 'cron';
    expression: string = '';
    isActive: boolean = true;
    retryCount: number = 0;
    fallbackDelay: number = 0;
    createdAt: string = '';
    updatedAt: string = '';

    constructor(init?: Partial<Schedule>) {
      Object.assign(this, init);
    }
  }

  export class ExecutionLog {
    id: number = 0;
    apiId: number = 0;
    scheduleId: number | null = null;
    statusCode: number = 0;
    response: string = '';
    error: string = '';
    executedAt: string = '';

    constructor(init?: Partial<ExecutionLog>) {
      Object.assign(this, init);
    }
  }
} 