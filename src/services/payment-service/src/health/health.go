package health

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

// Checker defines the interface for health check components
type Checker interface {
	// Name returns the name of the component being checked
	Name() string
	// Check performs the health check and returns an error if unhealthy
	Check(ctx context.Context) error
}

// CheckResult represents the result of a single health check
type CheckResult struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

// Response represents the health check response
type Response struct {
	Status string                 `json:"status"`
	Checks map[string]CheckResult `json:"checks,omitempty"`
}

// Server manages health check endpoints
type Server struct {
	checkers    []Checker
	ready       bool
	readyMu     sync.RWMutex
	serviceName string
}

// NewServer creates a new health server
func NewServer(serviceName string) *Server {
	return &Server{
		checkers:    make([]Checker, 0),
		ready:       false,
		serviceName: serviceName,
	}
}

// Register adds a health checker
func (s *Server) Register(checker Checker) {
	s.checkers = append(s.checkers, checker)
}

// SetReady marks the service as ready (for startup probe)
func (s *Server) SetReady(ready bool) {
	s.readyMu.Lock()
	defer s.readyMu.Unlock()
	s.ready = ready
}

// IsReady returns whether the service is ready
func (s *Server) IsReady() bool {
	s.readyMu.RLock()
	defer s.readyMu.RUnlock()
	return s.ready
}

// LivenessHandler handles liveness probe requests
// Liveness checks if the process is alive - minimal checks
func (s *Server) LivenessHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{Status: "ok"})
}

// ReadinessHandler handles readiness probe requests
// Readiness checks if the service can handle traffic
func (s *Server) ReadinessHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	response := Response{
		Status: "ok",
		Checks: make(map[string]CheckResult),
	}

	allHealthy := true

	for _, checker := range s.checkers {
		err := checker.Check(ctx)
		if err != nil {
			allHealthy = false
			response.Checks[checker.Name()] = CheckResult{
				Status:  "unhealthy",
				Message: err.Error(),
			}
			slog.Warn("Health check failed",
				"checker", checker.Name(),
				"error", err.Error(),
			)
		} else {
			response.Checks[checker.Name()] = CheckResult{
				Status: "ok",
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if allHealthy {
		w.WriteHeader(http.StatusOK)
	} else {
		response.Status = "unhealthy"
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	json.NewEncoder(w).Encode(response)
}

// StartupHandler handles startup probe requests
// Startup checks if the service has completed initialization
func (s *Server) StartupHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if s.IsReady() {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(Response{Status: "ok"})
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(Response{Status: "starting"})
	}
}

// StartHTTPServer starts the health check HTTP server
func (s *Server) StartHTTPServer(port string) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health/live", s.LivenessHandler)
	mux.HandleFunc("GET /health/ready", s.ReadinessHandler)
	mux.HandleFunc("GET /health/startup", s.StartupHandler)

	server := &http.Server{
		Addr:         "0.0.0.0:" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("Health check server starting",
			"service", s.serviceName,
			"port", port,
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Health check server failed", "error", err)
		}
	}()

	return server
}
