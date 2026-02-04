package health

import (
	"context"
	"fmt"

	tb "github.com/tigerbeetle/tigerbeetle-go"
	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

// TigerbeetleChecker checks TigerBeetle database connectivity
type TigerbeetleChecker struct {
	client tb.Client
}

// NewTigerbeetleChecker creates a new TigerBeetle health checker
func NewTigerbeetleChecker(client tb.Client) *TigerbeetleChecker {
	return &TigerbeetleChecker{client: client}
}

// Name returns the checker name
func (c *TigerbeetleChecker) Name() string {
	return "tigerbeetle"
}

// Check verifies the TigerBeetle connection is healthy
// We do a lightweight lookup of a non-existent account to verify connectivity
func (c *TigerbeetleChecker) Check(ctx context.Context) error {
	// Lookup a zero account ID - this is a lightweight operation that verifies connectivity
	// The account won't exist, but we'll get an empty result instead of an error if connected
	_, err := c.client.LookupAccounts([]tbt.Uint128{tbt.ToUint128(0)})
	if err != nil {
		return fmt.Errorf("tigerbeetle connection failed: %w", err)
	}
	return nil
}
