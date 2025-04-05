# FlowPulse

FlowPulse is a lightweight desktop application for managing and scheduling API executions. It provides an easy-to-use interface for configuring, monitoring, and scheduling API calls.

## Features

- **API Management**: Create, edit, and manage API configurations with support for various HTTP methods
- **Scheduling**: Set up recurring API calls using cron expressions or interval-based timing
- **Execution Logs**: Monitor API execution results with detailed logs
- **Dashboard**: View API health metrics and recent execution statistics

## Getting Started

### Prerequisites

- Go 1.18 or higher
- Node.js 16 or higher
- npm or yarn

### Installation

1. Clone the repository:
```
git clone https://github.com/yourname/flowpulse.git
cd flowpulse
```

2. Install frontend dependencies:
```
cd frontend
npm install
```

3. Install Go dependencies:
```
go mod tidy
```

### Development

To run the application in development mode:

```
wails dev
```

This will start the application in development mode with hot-reload for the frontend.

### Building

To build a production version:

```
wails build
```

The built application will be available in the `build/bin` directory.

## Technology Stack

- **Backend**: Go with SQLite database
- **Frontend**: React, TypeScript, Mantine UI
- **Desktop Framework**: Wails (Go + Web Technologies)

## Project Structure

- `/frontend`: React frontend application
  - `/src`: Source code
    - `/pages`: Application pages
    - `/types`: TypeScript interfaces
    - `/wailsjs`: Auto-generated Wails bindings
- `/pkg`: Go packages
  - `/database`: Database service
  - `/models`: Data models
  - `/scheduler`: Scheduler service

## License

MIT
