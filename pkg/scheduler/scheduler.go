package scheduler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/robfig/cron/v3"

	"flowpulse/pkg/database"
	"flowpulse/pkg/models"
)

// SchedulerService handles API execution scheduling
type SchedulerService struct {
	db            *database.DBService
	cron          *cron.Cron
	intervalJobs  map[int]*IntervalJob
	jobEntries    map[int]cron.EntryID
	client        *http.Client
	intervalMutex sync.Mutex
	cronMutex     sync.Mutex
}

// IntervalJob represents a job that runs at fixed intervals
type IntervalJob struct {
	scheduleID int
	apiID      int
	interval   time.Duration
	ticker     *time.Ticker
	done       chan bool
	isRunning  bool
}

// NewSchedulerService creates a new scheduler service
func NewSchedulerService(db *database.DBService) *SchedulerService {
	cronScheduler := cron.New(cron.WithSeconds())
	cronScheduler.Start()

	return &SchedulerService{
		db:           db,
		cron:         cronScheduler,
		intervalJobs: make(map[int]*IntervalJob),
		jobEntries:   make(map[int]cron.EntryID),
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// StartAllJobs starts all active jobs from the database
func (s *SchedulerService) StartAllJobs() error {
	schedules, err := s.db.GetAllActiveSchedules()
	if err != nil {
		return fmt.Errorf("failed to get active schedules: %w", err)
	}

	for _, schedule := range schedules {
		if err := s.ScheduleJob(schedule); err != nil {
			log.Printf("Failed to schedule job for schedule ID %d: %v", schedule.ID, err)
		}
	}

	return nil
}

// ScheduleJob schedules a job based on the schedule type
func (s *SchedulerService) ScheduleJob(schedule models.Schedule) error {
	// Check if the job is already scheduled
	if schedule.Type == "cron" {
		s.cronMutex.Lock()
		if _, exists := s.jobEntries[schedule.ID]; exists {
			s.cronMutex.Unlock()
			return nil // Job already scheduled
		}
		s.cronMutex.Unlock()
	} else {
		s.intervalMutex.Lock()
		if _, exists := s.intervalJobs[schedule.ID]; exists {
			s.intervalMutex.Unlock()
			return nil // Job already scheduled
		}
		s.intervalMutex.Unlock()
	}

	// Get the API to execute
	api, err := s.db.GetAPIByID(schedule.APIID)
	if err != nil {
		return fmt.Errorf("failed to get API: %w", err)
	}

	if schedule.Type == "cron" {
		// Schedule with cron
		entryID, err := s.cron.AddFunc(schedule.Expression, func() {
			s.executeAPI(api, schedule)
		})
		if err != nil {
			return fmt.Errorf("failed to add cron job: %w", err)
		}

		s.cronMutex.Lock()
		s.jobEntries[schedule.ID] = entryID
		s.cronMutex.Unlock()
	} else if schedule.Type == "interval" {
		// Parse interval in seconds
		intervalSec, err := strconv.Atoi(schedule.Expression)
		if err != nil {
			return fmt.Errorf("invalid interval: %w", err)
		}

		// Create interval job
		interval := time.Duration(intervalSec) * time.Second
		job := &IntervalJob{
			scheduleID: schedule.ID,
			apiID:      schedule.APIID,
			interval:   interval,
			ticker:     time.NewTicker(interval),
			done:       make(chan bool),
			isRunning:  true,
		}

		s.intervalMutex.Lock()
		s.intervalJobs[schedule.ID] = job
		s.intervalMutex.Unlock()

		// Start the interval job
		go s.runIntervalJob(job, api, schedule)
	} else {
		return fmt.Errorf("unsupported schedule type: %s", schedule.Type)
	}

	return nil
}

// StopJob stops a scheduled job
func (s *SchedulerService) StopJob(scheduleID int) error {
	// Try to stop cron job
	s.cronMutex.Lock()
	if entryID, exists := s.jobEntries[scheduleID]; exists {
		s.cron.Remove(entryID)
		delete(s.jobEntries, scheduleID)
		s.cronMutex.Unlock()
		return nil
	}
	s.cronMutex.Unlock()

	// Try to stop interval job
	s.intervalMutex.Lock()
	if job, exists := s.intervalJobs[scheduleID]; exists {
		job.done <- true
		job.ticker.Stop()
		delete(s.intervalJobs, scheduleID)
		s.intervalMutex.Unlock()
		return nil
	}
	s.intervalMutex.Unlock()

	return fmt.Errorf("job not found for schedule ID: %d", scheduleID)
}

// StopAllJobs stops all scheduled jobs
func (s *SchedulerService) StopAllJobs() {
	// Stop cron jobs
	s.cronMutex.Lock()
	for scheduleID, entryID := range s.jobEntries {
		s.cron.Remove(entryID)
		delete(s.jobEntries, scheduleID)
	}
	s.cronMutex.Unlock()

	// Stop interval jobs
	s.intervalMutex.Lock()
	for scheduleID, job := range s.intervalJobs {
		job.done <- true
		job.ticker.Stop()
		delete(s.intervalJobs, scheduleID)
	}
	s.intervalMutex.Unlock()

	// Stop the cron scheduler
	s.cron.Stop()
}

// runIntervalJob runs a job at fixed intervals
func (s *SchedulerService) runIntervalJob(job *IntervalJob, api models.API, schedule models.Schedule) {
	for {
		select {
		case <-job.ticker.C:
			s.executeAPI(api, schedule)
		case <-job.done:
			return
		}
	}
}

// executeAPI executes the API call and logs the result
func (s *SchedulerService) executeAPI(api models.API, schedule models.Schedule) {
	var statusCode int
	var responseBody, errMsg string

	// Prepare request
	req, err := s.prepareAPIRequest(api)
	if err != nil {
		errMsg = fmt.Sprintf("Failed to prepare request: %v", err)
		s.logExecution(api.ID, schedule.ID, 0, "", errMsg)
		return
	}

	// Execute with retry logic
	retryCount := schedule.RetryCount
	fallbackDelay := time.Duration(schedule.FallbackDelay) * time.Second

	for attempt := 0; attempt <= retryCount; attempt++ {
		if attempt > 0 {
			log.Printf("Retrying API execution (attempt %d/%d) for schedule ID %d after %v delay", 
				attempt, retryCount, schedule.ID, fallbackDelay)
			time.Sleep(fallbackDelay)
		}

		resp, err := s.client.Do(req)
		if err == nil {
			// Read response
			buf := new(bytes.Buffer)
			buf.ReadFrom(resp.Body)
			responseBody = buf.String()
			resp.Body.Close()
			statusCode = resp.StatusCode

			// Break on success (2xx status code)
			if statusCode >= 200 && statusCode < 300 {
				break
			}

			// If not successful and we have more retries, continue
			if attempt < retryCount {
				errMsg = fmt.Sprintf("API returned non-success status code: %d", statusCode)
				continue
			}
		} else {
			if attempt < retryCount {
				errMsg = fmt.Sprintf("Request failed: %v", err)
				continue
			} else {
				errMsg = fmt.Sprintf("All retry attempts failed. Last error: %v", err)
				statusCode = 0
			}
		}
	}

	// Log the execution results
	s.logExecution(api.ID, schedule.ID, statusCode, responseBody, errMsg)
}

// prepareAPIRequest creates an HTTP request from API configuration
func (s *SchedulerService) prepareAPIRequest(api models.API) (*http.Request, error) {
	var body io.Reader
	if api.Body != "" {
		body = strings.NewReader(api.Body)
	}

	req, err := http.NewRequest(api.Method, api.URL, body)
	if err != nil {
		return nil, err
	}

	// Add headers
	if api.Headers != "" {
		var headers map[string]string
		if err := json.Unmarshal([]byte(api.Headers), &headers); err != nil {
			return nil, fmt.Errorf("failed to parse headers: %w", err)
		}

		for k, v := range headers {
			req.Header.Set(k, v)
		}
	}

	return req, nil
}

// logExecution logs the API execution results to the database
func (s *SchedulerService) logExecution(apiID, scheduleID, statusCode int, response, errMsg string) {
	executionLog := models.ExecutionLog{
		APIID:      apiID,
		ScheduleID: scheduleID,
		StatusCode: statusCode,
		Response:   response,
		Error:      errMsg,
		ExecutedAt: time.Now(),
	}

	_, err := s.db.CreateExecutionLog(executionLog)
	if err != nil {
		log.Printf("Failed to create execution log: %v", err)
	}
}

// ExecuteAPIManually executes an API immediately without scheduling
func (s *SchedulerService) ExecuteAPIManually(apiID int) error {
	api, err := s.db.GetAPIByID(apiID)
	if err != nil {
		return fmt.Errorf("failed to get API: %w", err)
	}

	// Create a dummy schedule for logging purposes
	dummySchedule := models.Schedule{
		ID:   0,
		APIID: apiID,
	}

	// Execute in a separate goroutine to not block
	go s.executeAPI(api, dummySchedule)
	
	return nil
}

// Shutdown gracefully shuts down the scheduler
func (s *SchedulerService) Shutdown() {
	log.Println("Shutting down scheduler...")
	s.StopAllJobs()
} 