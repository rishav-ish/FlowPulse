package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"

	"flowpulse/pkg/models"
)

// DBService handles all database operations
type DBService struct {
	db *sql.DB
}

// NewDBService creates a new database service
func NewDBService() (*DBService, error) {
	// Get application directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get user home directory: %w", err)
	}

	appDir := filepath.Join(homeDir, ".flowpulse")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create app directory: %w", err)
	}

	dbPath := filepath.Join(appDir, "flowpulse.db")
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	service := &DBService{db: db}
	if err := service.initDB(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	return service, nil
}

// Close closes the database connection
func (s *DBService) Close() error {
	return s.db.Close()
}

// initDB initializes the database with required tables
func (s *DBService) initDB() error {
	// Create APIs table
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS apis (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			method TEXT NOT NULL,
			url TEXT NOT NULL,
			headers TEXT,
			body TEXT,
			description TEXT,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		)
	`)
	if err != nil {
		return err
	}
	
	// Check if collection_id column exists in apis table, and add it if not
	var columnExists bool
	err = s.db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('apis') WHERE name = 'collection_id'").Scan(&columnExists)
	if err != nil {
		return fmt.Errorf("failed to check for collection_id column: %w", err)
	}
	
	if !columnExists {
		// Add collection_id column to apis table
		_, err = s.db.Exec("ALTER TABLE apis ADD COLUMN collection_id INTEGER DEFAULT 0")
		if err != nil {
			return fmt.Errorf("failed to add collection_id column: %w", err)
		}
	}
	
	// Create Collections table
	_, err = s.db.Exec(`
		CREATE TABLE IF NOT EXISTS collections (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		)
	`)
	if err != nil {
		return err
	}

	// Create Schedules table
	_, err = s.db.Exec(`
		CREATE TABLE IF NOT EXISTS schedules (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			api_id INTEGER NOT NULL,
			type TEXT NOT NULL,
			expression TEXT NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT 0,
			retry_count INTEGER NOT NULL DEFAULT 0,
			fallback_delay INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL,
			FOREIGN KEY (api_id) REFERENCES apis (id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create Execution Logs table
	_, err = s.db.Exec(`
		CREATE TABLE IF NOT EXISTS execution_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			api_id INTEGER NOT NULL,
			schedule_id INTEGER NOT NULL,
			status_code INTEGER,
			response TEXT,
			error TEXT,
			executed_at TIMESTAMP NOT NULL,
			FOREIGN KEY (api_id) REFERENCES apis (id) ON DELETE CASCADE,
			FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	return nil
}

// API Operations

// CreateAPI creates a new API
func (s *DBService) CreateAPI(api models.API) (models.API, error) {
	now := time.Now()
	api.CreatedAt = now
	api.UpdatedAt = now

	result, err := s.db.Exec(
		"INSERT INTO apis (name, method, url, headers, body, description, collection_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		api.Name, api.Method, api.URL, api.Headers, api.Body, api.Description, api.CollectionID, api.CreatedAt, api.UpdatedAt,
	)
	if err != nil {
		return api, fmt.Errorf("failed to create API: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return api, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	api.ID = int(id)
	return api, nil
}

// UpdateAPI updates an existing API
func (s *DBService) UpdateAPI(api models.API) (models.API, error) {
	api.UpdatedAt = time.Now()

	_, err := s.db.Exec(
		"UPDATE apis SET name = ?, method = ?, url = ?, headers = ?, body = ?, description = ?, collection_id = ?, updated_at = ? WHERE id = ?",
		api.Name, api.Method, api.URL, api.Headers, api.Body, api.Description, api.CollectionID, api.UpdatedAt, api.ID,
	)
	if err != nil {
		return api, fmt.Errorf("failed to update API: %w", err)
	}

	// Get the updated API
	updatedAPI, err := s.GetAPIByID(api.ID)
	if err != nil {
		return api, fmt.Errorf("failed to get updated API: %w", err)
	}

	return updatedAPI, nil
}

// DeleteAPI deletes an API by ID
func (s *DBService) DeleteAPI(id int) error {
	_, err := s.db.Exec("DELETE FROM apis WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete API: %w", err)
	}
	return nil
}

// GetAPIByID gets an API by ID
func (s *DBService) GetAPIByID(id int) (models.API, error) {
	var api models.API
	
	// Use a more resilient query that handles potential missing collection_id column
	err := s.db.QueryRow(`
		SELECT 
			id, name, method, url, headers, body, description, 
			COALESCE(collection_id, 0) as collection_id, 
			created_at, updated_at 
		FROM apis WHERE id = ?`,
		id,
	).Scan(
		&api.ID, &api.Name, &api.Method, &api.URL, &api.Headers, &api.Body, 
		&api.Description, &api.CollectionID, &api.CreatedAt, &api.UpdatedAt,
	)
	if err != nil {
		return api, fmt.Errorf("failed to get API by ID: %w", err)
	}
	return api, nil
}

// GetAllAPIs gets all APIs
func (s *DBService) GetAllAPIs() ([]models.API, error) {
	// Use a more resilient query that handles potential missing collection_id column
	rows, err := s.db.Query(`
		SELECT 
			id, name, method, url, headers, body, description, 
			COALESCE(collection_id, 0) as collection_id, 
			created_at, updated_at 
		FROM apis ORDER BY name
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query APIs: %w", err)
	}
	defer rows.Close()

	var apis []models.API
	for rows.Next() {
		var api models.API
		if err := rows.Scan(&api.ID, &api.Name, &api.Method, &api.URL, &api.Headers, 
			&api.Body, &api.Description, &api.CollectionID, &api.CreatedAt, &api.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan API row: %w", err)
		}
		apis = append(apis, api)
	}

	return apis, nil
}

// Schedule Operations

// CreateSchedule creates a new schedule
func (s *DBService) CreateSchedule(schedule models.Schedule) (models.Schedule, error) {
	now := time.Now()
	schedule.CreatedAt = now
	schedule.UpdatedAt = now

	result, err := s.db.Exec(
		"INSERT INTO schedules (api_id, type, expression, is_active, retry_count, fallback_delay, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		schedule.APIID, schedule.Type, schedule.Expression, schedule.IsActive, schedule.RetryCount, schedule.FallbackDelay, schedule.CreatedAt, schedule.UpdatedAt,
	)
	if err != nil {
		return schedule, fmt.Errorf("failed to create schedule: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return schedule, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	schedule.ID = int(id)
	return schedule, nil
}

// UpdateSchedule updates an existing schedule
func (s *DBService) UpdateSchedule(schedule models.Schedule) error {
	schedule.UpdatedAt = time.Now()

	_, err := s.db.Exec(
		"UPDATE schedules SET api_id = ?, type = ?, expression = ?, is_active = ?, retry_count = ?, fallback_delay = ?, updated_at = ? WHERE id = ?",
		schedule.APIID, schedule.Type, schedule.Expression, schedule.IsActive, schedule.RetryCount, schedule.FallbackDelay, schedule.UpdatedAt, schedule.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update schedule: %w", err)
	}
	return nil
}

// DeleteSchedule deletes a schedule by ID
func (s *DBService) DeleteSchedule(id int) error {
	_, err := s.db.Exec("DELETE FROM schedules WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete schedule: %w", err)
	}
	return nil
}

// GetScheduleByID gets a schedule by ID
func (s *DBService) GetScheduleByID(id int) (models.Schedule, error) {
	var schedule models.Schedule
	err := s.db.QueryRow(
		"SELECT id, api_id, type, expression, is_active, retry_count, fallback_delay, created_at, updated_at FROM schedules WHERE id = ?",
		id,
	).Scan(
		&schedule.ID, &schedule.APIID, &schedule.Type, &schedule.Expression, &schedule.IsActive, &schedule.RetryCount, &schedule.FallbackDelay, &schedule.CreatedAt, &schedule.UpdatedAt,
	)
	if err != nil {
		return schedule, fmt.Errorf("failed to get schedule by ID: %w", err)
	}
	return schedule, nil
}

// GetAllSchedules gets all schedules
func (s *DBService) GetAllSchedules() ([]models.Schedule, error) {
	rows, err := s.db.Query("SELECT id, api_id, type, expression, is_active, retry_count, fallback_delay, created_at, updated_at FROM schedules ORDER BY created_at DESC")
	if err != nil {
		return nil, fmt.Errorf("failed to query schedules: %w", err)
	}
	defer rows.Close()

	var schedules []models.Schedule
	for rows.Next() {
		var schedule models.Schedule
		if err := rows.Scan(&schedule.ID, &schedule.APIID, &schedule.Type, &schedule.Expression, &schedule.IsActive, &schedule.RetryCount, &schedule.FallbackDelay, &schedule.CreatedAt, &schedule.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan schedule row: %w", err)
		}
		schedules = append(schedules, schedule)
	}

	return schedules, nil
}

// GetSchedulesByAPIID gets all schedules for an API
func (s *DBService) GetSchedulesByAPIID(apiID int) ([]models.Schedule, error) {
	rows, err := s.db.Query("SELECT id, api_id, type, expression, is_active, retry_count, fallback_delay, created_at, updated_at FROM schedules WHERE api_id = ? ORDER BY created_at DESC", apiID)
	if err != nil {
		return nil, fmt.Errorf("failed to query schedules by API ID: %w", err)
	}
	defer rows.Close()

	var schedules []models.Schedule
	for rows.Next() {
		var schedule models.Schedule
		if err := rows.Scan(&schedule.ID, &schedule.APIID, &schedule.Type, &schedule.Expression, &schedule.IsActive, &schedule.RetryCount, &schedule.FallbackDelay, &schedule.CreatedAt, &schedule.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan schedule row: %w", err)
		}
		schedules = append(schedules, schedule)
	}

	return schedules, nil
}

// GetAllActiveSchedules gets all active schedules
func (s *DBService) GetAllActiveSchedules() ([]models.Schedule, error) {
	rows, err := s.db.Query("SELECT id, api_id, type, expression, is_active, retry_count, fallback_delay, created_at, updated_at FROM schedules WHERE is_active = 1")
	if err != nil {
		return nil, fmt.Errorf("failed to query active schedules: %w", err)
	}
	defer rows.Close()

	var schedules []models.Schedule
	for rows.Next() {
		var schedule models.Schedule
		if err := rows.Scan(&schedule.ID, &schedule.APIID, &schedule.Type, &schedule.Expression, &schedule.IsActive, &schedule.RetryCount, &schedule.FallbackDelay, &schedule.CreatedAt, &schedule.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan schedule row: %w", err)
		}
		schedules = append(schedules, schedule)
	}

	return schedules, nil
}

// Execution Log Operations

// CreateExecutionLog creates a new execution log
func (s *DBService) CreateExecutionLog(log models.ExecutionLog) (models.ExecutionLog, error) {
	// Truncate response and error if they are too large for SQLite
	if len(log.Response) > 10000 {
		log.Response = log.Response[:10000] + "... (truncated)"
	}
	
	if len(log.Error) > 5000 {
		log.Error = log.Error[:5000] + "... (truncated)"
	}

	log.ExecutedAt = time.Now()

	result, err := s.db.Exec(
		"INSERT INTO execution_logs (api_id, schedule_id, status_code, response, error, executed_at) VALUES (?, ?, ?, ?, ?, ?)",
		log.APIID, log.ScheduleID, log.StatusCode, log.Response, log.Error, log.ExecutedAt,
	)
	if err != nil {
		return log, fmt.Errorf("failed to create execution log: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return log, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	log.ID = int(id)
	return log, nil
}

// GetExecutionLogsByAPIID gets execution logs for an API
func (s *DBService) GetExecutionLogsByAPIID(apiID int, limit int) ([]models.ExecutionLog, error) {
	query := `
		SELECT id, api_id, schedule_id, status_code, response, error, executed_at 
		FROM execution_logs 
		WHERE api_id = ? 
		ORDER BY executed_at DESC 
		LIMIT ?
	`
	
	rows, err := s.db.Query(query, apiID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query execution logs by API ID: %w", err)
	}
	defer rows.Close()

	var logs []models.ExecutionLog
	for rows.Next() {
		var log models.ExecutionLog
		if err := rows.Scan(&log.ID, &log.APIID, &log.ScheduleID, &log.StatusCode, &log.Response, &log.Error, &log.ExecutedAt); err != nil {
			return nil, fmt.Errorf("failed to scan execution log row: %w", err)
		}
		logs = append(logs, log)
	}

	return logs, nil
}

// GetAllExecutionLogs gets all execution logs with pagination
func (s *DBService) GetAllExecutionLogs(page, pageSize int) ([]models.ExecutionLog, error) {
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT id, api_id, schedule_id, status_code, response, error, executed_at
		FROM execution_logs
		ORDER BY executed_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := s.db.Query(query, pageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query execution logs: %w", err)
	}
	defer rows.Close()

	var logs []models.ExecutionLog
	for rows.Next() {
		var log models.ExecutionLog
		if err := rows.Scan(&log.ID, &log.APIID, &log.ScheduleID, &log.StatusCode, &log.Response, &log.Error, &log.ExecutedAt); err != nil {
			return nil, fmt.Errorf("failed to scan execution log row: %w", err)
		}
		logs = append(logs, log)
	}

	return logs, nil
}

// GetRecentExecutions gets the most recent execution logs
func (s *DBService) GetRecentExecutions(limit int) ([]models.ExecutionLog, error) {
	query := `
		SELECT id, api_id, schedule_id, status_code, response, error, executed_at
		FROM execution_logs
		ORDER BY executed_at DESC
		LIMIT ?
	`

	rows, err := s.db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query recent executions: %w", err)
	}
	defer rows.Close()

	var logs []models.ExecutionLog
	for rows.Next() {
		var log models.ExecutionLog
		if err := rows.Scan(&log.ID, &log.APIID, &log.ScheduleID, &log.StatusCode, &log.Response, &log.Error, &log.ExecutedAt); err != nil {
			return nil, fmt.Errorf("failed to scan execution log row: %w", err)
		}
		logs = append(logs, log)
	}

	return logs, nil
}

// Collection Operations

// CreateCollection creates a new collection
func (s *DBService) CreateCollection(collection models.Collection) (models.Collection, error) {
	now := time.Now()
	collection.CreatedAt = now
	collection.UpdatedAt = now

	result, err := s.db.Exec(
		"INSERT INTO collections (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
		collection.Name, collection.Description, collection.CreatedAt, collection.UpdatedAt,
	)
	if err != nil {
		return collection, fmt.Errorf("failed to create collection: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return collection, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	collection.ID = int(id)
	return collection, nil
}

// UpdateCollection updates an existing collection
func (s *DBService) UpdateCollection(collection models.Collection) (models.Collection, error) {
	collection.UpdatedAt = time.Now()

	_, err := s.db.Exec(
		"UPDATE collections SET name = ?, description = ?, updated_at = ? WHERE id = ?",
		collection.Name, collection.Description, collection.UpdatedAt, collection.ID,
	)
	if err != nil {
		return collection, fmt.Errorf("failed to update collection: %w", err)
	}

	// Get the updated collection
	updatedCollection, err := s.GetCollectionByID(collection.ID)
	if err != nil {
		return collection, fmt.Errorf("failed to get updated collection: %w", err)
	}

	return updatedCollection, nil
}

// DeleteCollection deletes a collection by ID
func (s *DBService) DeleteCollection(id int) error {
	// First, update all APIs to remove them from this collection
	_, err := s.db.Exec("UPDATE apis SET collection_id = 0 WHERE collection_id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to update APIs: %w", err)
	}

	// Then delete the collection
	_, err = s.db.Exec("DELETE FROM collections WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete collection: %w", err)
	}
	return nil
}

// GetCollectionByID gets a collection by ID
func (s *DBService) GetCollectionByID(id int) (models.Collection, error) {
	var collection models.Collection
	err := s.db.QueryRow(
		"SELECT id, name, description, created_at, updated_at FROM collections WHERE id = ?",
		id,
	).Scan(
		&collection.ID, &collection.Name, &collection.Description, &collection.CreatedAt, &collection.UpdatedAt,
	)
	if err != nil {
		return collection, fmt.Errorf("failed to get collection by ID: %w", err)
	}
	return collection, nil
}

// GetAllCollections gets all collections
func (s *DBService) GetAllCollections() ([]models.Collection, error) {
	rows, err := s.db.Query("SELECT id, name, description, created_at, updated_at FROM collections ORDER BY name")
	if err != nil {
		return nil, fmt.Errorf("failed to query collections: %w", err)
	}
	defer rows.Close()

	var collections []models.Collection
	for rows.Next() {
		var collection models.Collection
		if err := rows.Scan(&collection.ID, &collection.Name, &collection.Description, &collection.CreatedAt, &collection.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan collection row: %w", err)
		}
		collections = append(collections, collection)
	}

	return collections, nil
}

// GetAPIsByCollectionID gets all APIs in a collection
func (s *DBService) GetAPIsByCollectionID(collectionID int) ([]models.API, error) {
	// Use a more resilient query with COALESCE
	rows, err := s.db.Query(`
		SELECT 
			id, name, method, url, headers, body, description, 
			COALESCE(collection_id, 0) as collection_id, 
			created_at, updated_at 
		FROM apis 
		WHERE COALESCE(collection_id, 0) = ? 
		ORDER BY name`,
		collectionID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query APIs in collection: %w", err)
	}
	defer rows.Close()

	var apis []models.API
	for rows.Next() {
		var api models.API
		if err := rows.Scan(&api.ID, &api.Name, &api.Method, &api.URL, &api.Headers, 
			&api.Body, &api.Description, &api.CollectionID, &api.CreatedAt, &api.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan API row: %w", err)
		}
		apis = append(apis, api)
	}

	return apis, nil
}

// GetAPIAnalytics provides analytics for a specific API
func (s *DBService) GetAPIAnalytics(apiID int) (models.AnalyticsSummary, error) {
	var analytics models.AnalyticsSummary
	
	// Get total executions
	var totalCount int
	err := s.db.QueryRow("SELECT COUNT(*) FROM execution_logs WHERE api_id = ?", apiID).Scan(&totalCount)
	if err != nil {
		return analytics, fmt.Errorf("failed to get execution count: %w", err)
	}
	analytics.TotalExecutions = totalCount
	
	// Get success count (status code 2xx)
	var successCount int
	err = s.db.QueryRow("SELECT COUNT(*) FROM execution_logs WHERE api_id = ? AND status_code >= 200 AND status_code < 300", apiID).Scan(&successCount)
	if err != nil {
		return analytics, fmt.Errorf("failed to get success count: %w", err)
	}
	analytics.SuccessCount = successCount
	
	// Calculate failure count
	analytics.FailureCount = totalCount - successCount
	
	// Calculate success rate and error rate
	if totalCount > 0 {
		analytics.SuccessRate = float64(successCount) / float64(totalCount) * 100
		analytics.ErrorRate = 100 - analytics.SuccessRate
	}
	
	// Calculate an estimated uptime (simplistic approach based on success rate)
	analytics.Uptime = analytics.SuccessRate
	
	// Get most recent execution time
	var lastExecutionTime sql.NullTime
	err = s.db.QueryRow("SELECT executed_at FROM execution_logs WHERE api_id = ? ORDER BY executed_at DESC LIMIT 1", apiID).Scan(&lastExecutionTime)
	if err != nil && err != sql.ErrNoRows {
		return analytics, fmt.Errorf("failed to get last execution time: %w", err)
	}
	if lastExecutionTime.Valid {
		analytics.LastExecutionTime = lastExecutionTime.Time.Format(time.RFC3339)
	}
	
	return analytics, nil
}

// GetOverallAnalytics provides aggregated analytics for all APIs
func (s *DBService) GetOverallAnalytics() (models.AnalyticsSummary, error) {
	var analytics models.AnalyticsSummary
	
	// Get total executions
	var totalCount int
	err := s.db.QueryRow("SELECT COUNT(*) FROM execution_logs").Scan(&totalCount)
	if err != nil {
		return analytics, fmt.Errorf("failed to get execution count: %w", err)
	}
	analytics.TotalExecutions = totalCount
	
	// Get success count (status code 2xx)
	var successCount int
	err = s.db.QueryRow("SELECT COUNT(*) FROM execution_logs WHERE status_code >= 200 AND status_code < 300").Scan(&successCount)
	if err != nil {
		return analytics, fmt.Errorf("failed to get success count: %w", err)
	}
	analytics.SuccessCount = successCount
	
	// Calculate failure count
	analytics.FailureCount = totalCount - successCount
	
	// Calculate success rate and error rate
	if totalCount > 0 {
		analytics.SuccessRate = float64(successCount) / float64(totalCount) * 100
		analytics.ErrorRate = 100 - analytics.SuccessRate
	}
	
	// Calculate an estimated uptime (simplistic approach based on success rate)
	analytics.Uptime = analytics.SuccessRate
	
	// Get most recent execution time
	var lastExecutionTime sql.NullTime
	err = s.db.QueryRow("SELECT executed_at FROM execution_logs ORDER BY executed_at DESC LIMIT 1").Scan(&lastExecutionTime)
	if err != nil && err != sql.ErrNoRows {
		return analytics, fmt.Errorf("failed to get last execution time: %w", err)
	}
	if lastExecutionTime.Valid {
		analytics.LastExecutionTime = lastExecutionTime.Time.Format(time.RFC3339)
	}
	
	return analytics, nil
} 