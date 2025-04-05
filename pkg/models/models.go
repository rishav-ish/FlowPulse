package models

import (
	"time"
)

// API represents an API configuration that can be scheduled
type API struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Method       string    `json:"method"`
	URL          string    `json:"url"`
	Headers      string    `json:"headers"` // JSON string of headers
	Body         string    `json:"body"`
	Description  string    `json:"description"`
	CollectionID int       `json:"collectionId"` // ID of the collection this API belongs to (0 for no collection)
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Collection represents a group of APIs
type Collection struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Schedule represents a schedule for executing an API
type Schedule struct {
	ID            int       `json:"id"`
	APIID         int       `json:"apiId"`
	Type          string    `json:"type"` // "cron" or "interval"
	Expression    string    `json:"expression"` // Cron expression or interval in seconds
	IsActive      bool      `json:"isActive"`
	RetryCount    int       `json:"retryCount"`
	FallbackDelay int       `json:"fallbackDelay"` // In seconds
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// ExecutionLog represents a log of an API execution
type ExecutionLog struct {
	ID          int       `json:"id"`
	APIID       int       `json:"apiId"`
	ScheduleID  int       `json:"scheduleId"`
	StatusCode  int       `json:"statusCode"`
	Response    string    `json:"response"`
	Error       string    `json:"error"`
	ExecutedAt  time.Time `json:"executedAt"`
}

// AnalyticsSummary represents a summary of execution statistics
type AnalyticsSummary struct {
	TotalExecutions   int     `json:"totalExecutions"`
	SuccessCount      int     `json:"successCount"`
	FailureCount      int     `json:"failureCount"`
	SuccessRate       float64 `json:"successRate"`
	AverageTimeMs     float64 `json:"averageTimeMs"` // Average execution time in milliseconds (if tracked)
	LastExecutionTime string  `json:"lastExecutionTime"`
	ErrorRate         float64 `json:"errorRate"`     // Calculated as 100 - successRate
	Uptime            float64 `json:"uptime"`        // If calculating uptime is relevant
} 