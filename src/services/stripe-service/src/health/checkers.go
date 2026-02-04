package health

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
)

// PostgresChecker checks PostgreSQL database connectivity
type PostgresChecker struct {
	db *sqlx.DB
}

// NewPostgresChecker creates a new PostgreSQL health checker
func NewPostgresChecker(db *sqlx.DB) *PostgresChecker {
	return &PostgresChecker{db: db}
}

// Name returns the checker name
func (c *PostgresChecker) Name() string {
	return "postgres"
}

// Check verifies the PostgreSQL connection is healthy
func (c *PostgresChecker) Check(ctx context.Context) error {
	if err := c.db.PingContext(ctx); err != nil {
		return fmt.Errorf("postgres connection failed: %w", err)
	}
	return nil
}

// GrpcChecker checks gRPC connection state
type GrpcChecker struct {
	conn        *grpc.ClientConn
	serviceName string
}

// NewGrpcChecker creates a new gRPC connection health checker
func NewGrpcChecker(conn *grpc.ClientConn, serviceName string) *GrpcChecker {
	return &GrpcChecker{
		conn:        conn,
		serviceName: serviceName,
	}
}

// Name returns the checker name
func (c *GrpcChecker) Name() string {
	return c.serviceName + "-grpc"
}

// Check verifies the gRPC connection is in a healthy state
func (c *GrpcChecker) Check(ctx context.Context) error {
	state := c.conn.GetState()
	switch state {
	case connectivity.Ready:
		return nil
	case connectivity.Idle:
		// Idle is acceptable - connection will be established on demand
		// Trigger a connection attempt for next check
		c.conn.Connect()
		return nil
	case connectivity.Connecting:
		// Still connecting, acceptable for readiness
		return nil
	case connectivity.TransientFailure:
		return fmt.Errorf("%s grpc connection in transient failure state", c.serviceName)
	case connectivity.Shutdown:
		return fmt.Errorf("%s grpc connection is shutdown", c.serviceName)
	default:
		return fmt.Errorf("%s grpc connection in unknown state: %v", c.serviceName, state)
	}
}
