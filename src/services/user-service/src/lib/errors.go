package lib

import "errors"

var (
	ErrUnexpected          = errors.New("UNEXPECTED_ERROR")
	ErrNotFound            = errors.New("NOT_FOUND")
	ErrOTPMismatch         = errors.New("OTP_MISMATCH")
	ErrUnacceptableRequest = errors.New("UNACCEPTABLE")
	ErrTokenExpired        = errors.New("TOKEN_EXPIRED")
	ErrConflict            = errors.New("CONFLICT")
)
