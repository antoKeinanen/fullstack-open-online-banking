package lib

import "errors"

var (
	ErrUnexpected     = errors.New("UNEXPECTED")
	ErrInvalidRequest = errors.New("INVALID_REQUEST")
	ErrNotEnoughFunds = errors.New("NOT_ENOUGH_FUNDS")
	ErrNotFound       = errors.New("NOT_FOUND")
)
