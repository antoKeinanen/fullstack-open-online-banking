package main

import "errors"

var (
	ErrUnexpected     = errors.New("UNEXPECTED")
	ErrInvalidRequest = errors.New("INVALID_REQUEST")
	ErrNotEnoughFunds = errors.New("NOT_ENOUGH_FUNDS")
)
