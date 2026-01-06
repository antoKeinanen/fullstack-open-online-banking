package lib

import "errors"

var (
	ErrUnexpected          = errors.New("UNEXPECTED_ERROR")
	ErrNotFound            = errors.New("NOT_FOUND")
	ErrUnacceptableRequest = errors.New("UNACCEPTABLE")
	ErrConflict            = errors.New("CONFLICT")
)
