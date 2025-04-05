package main

import (
	"context"
	"fmt"
	"log"

	"flowpulse/pkg/database"
	"flowpulse/pkg/models"
	"flowpulse/pkg/scheduler"
)

// App struct
type App struct {
	ctx       context.Context
	db        *database.DBService
	scheduler *scheduler.SchedulerService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize the database
	db, err := database.NewDBService()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	a.db = db

	// Initialize the scheduler
	a.scheduler = scheduler.NewSchedulerService(db)

	// Start all active jobs
	if err := a.scheduler.StartAllJobs(); err != nil {
		log.Printf("Failed to start jobs: %v", err)
	}

	log.Println("FlowPulse started successfully!")
}

// shutdown is called when the app is about to quit
func (a *App) shutdown(ctx context.Context) {
	log.Println("Shutting down FlowPulse...")
	if a.scheduler != nil {
		a.scheduler.Shutdown()
	}

	if a.db != nil {
		a.db.Close()
	}
}

// APIs methods

// GetAllAPIs returns all APIs
func (a *App) GetAllAPIs() ([]models.API, error) {
	return a.db.GetAllAPIs()
}

// GetAPIByID returns an API by ID
func (a *App) GetAPIByID(id int) (models.API, error) {
	return a.db.GetAPIByID(id)
}

// CreateAPI creates a new API
func (a *App) CreateAPI(api models.API) (models.API, error) {
	return a.db.CreateAPI(api)
}

// UpdateAPI updates an existing API
func (a *App) UpdateAPI(api models.API) (models.API, error) {
	return a.db.UpdateAPI(api)
}

// DeleteAPI deletes an API by ID
func (a *App) DeleteAPI(id int) error {
	return a.db.DeleteAPI(id)
}

// Schedules methods

// GetAllSchedules returns all schedules
func (a *App) GetAllSchedules() ([]models.Schedule, error) {
	return a.db.GetAllSchedules()
}

// GetSchedulesByAPIID returns all schedules for an API
func (a *App) GetSchedulesByAPIID(apiID int) ([]models.Schedule, error) {
	return a.db.GetSchedulesByAPIID(apiID)
}

// CreateSchedule creates a new schedule
func (a *App) CreateSchedule(schedule models.Schedule) (models.Schedule, error) {
	newSchedule, err := a.db.CreateSchedule(schedule)
	if err != nil {
		return newSchedule, err
	}

	// If the schedule is active, schedule it
	if newSchedule.IsActive {
		if err := a.scheduler.ScheduleJob(newSchedule); err != nil {
			return newSchedule, fmt.Errorf("schedule created but failed to start job: %w", err)
		}
	}

	return newSchedule, nil
}

// UpdateSchedule updates an existing schedule
func (a *App) UpdateSchedule(schedule models.Schedule) error {
	// Get the current state of the schedule
	currentSchedule, err := a.db.GetScheduleByID(schedule.ID)
	if err != nil {
		return err
	}

	isCurrentlyActive := currentSchedule.IsActive

	// Update the schedule in the database
	if err := a.db.UpdateSchedule(schedule); err != nil {
		return err
	}

	// Handle job scheduling based on active state changes
	if isCurrentlyActive && !schedule.IsActive {
		// Stop the job
		if err := a.scheduler.StopJob(schedule.ID); err != nil {
			return fmt.Errorf("schedule updated but failed to stop job: %w", err)
		}
	} else if !isCurrentlyActive && schedule.IsActive {
		// Start the job
		if err := a.scheduler.ScheduleJob(schedule); err != nil {
			return fmt.Errorf("schedule updated but failed to start job: %w", err)
		}
	} else if isCurrentlyActive && schedule.IsActive {
		// Update the job by stopping and restarting
		if err := a.scheduler.StopJob(schedule.ID); err != nil {
			log.Printf("Failed to stop existing job for schedule ID %d: %v", schedule.ID, err)
		}
		if err := a.scheduler.ScheduleJob(schedule); err != nil {
			return fmt.Errorf("schedule updated but failed to restart job: %w", err)
		}
	}

	return nil
}

// DeleteSchedule deletes a schedule by ID
func (a *App) DeleteSchedule(id int) error {
	// Stop the job first
	if err := a.scheduler.StopJob(id); err != nil {
		log.Printf("Failed to stop job for schedule ID %d: %v", id, err)
	}

	// Delete from database
	return a.db.DeleteSchedule(id)
}

// ToggleSchedule toggles the active state of a schedule
func (a *App) ToggleSchedule(id int, isActive bool) error {
	schedule, err := a.db.GetScheduleByID(id)
	if err != nil {
		return fmt.Errorf("failed to get schedule: %w", err)
	}

	schedule.IsActive = isActive
	return a.UpdateSchedule(schedule)
}

// CancelSchedule cancels a schedule permanently
func (a *App) CancelSchedule(id int) error {
	// First get the schedule
	schedule, err := a.db.GetScheduleByID(id)
	if err != nil {
		return fmt.Errorf("failed to get schedule: %w", err)
	}

	// Stop the job
	if err := a.scheduler.StopJob(id); err != nil {
		log.Printf("Failed to stop job for schedule ID %d: %v", id, err)
	}

	// Update to inactive status
	schedule.IsActive = false
	return a.db.UpdateSchedule(schedule)
}

// Logs methods

// GetExecutionLogsByAPIID returns execution logs for an API
func (a *App) GetExecutionLogsByAPIID(apiID int, limit int) ([]models.ExecutionLog, error) {
	return a.db.GetExecutionLogsByAPIID(apiID, limit)
}

// GetAllExecutionLogs returns all execution logs with pagination
func (a *App) GetAllExecutionLogs(page, pageSize int) ([]models.ExecutionLog, error) {
	return a.db.GetAllExecutionLogs(page, pageSize)
}

// GetRecentExecutions returns the most recent execution logs
func (a *App) GetRecentExecutions(limit int) ([]models.ExecutionLog, error) {
	return a.db.GetRecentExecutions(limit)
}

// ExecuteAPIManually executes an API immediately (run now)
func (a *App) ExecuteAPIManually(apiID int) error {
	return a.scheduler.ExecuteAPIManually(apiID)
}
