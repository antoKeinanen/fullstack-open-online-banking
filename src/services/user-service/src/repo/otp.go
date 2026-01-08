package repo

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"user-service/src/lib"
	"user-service/src/queries"

	"github.com/jmoiron/sqlx"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

type OTPCode struct {
	HashedOTPCode string `db:"one_time_passcode_hash"`
	UserId        string `db:"user_id"`
}

func StoreOTP(db *sqlx.DB, ctx context.Context, phoneNumber, hashedOtpCode string) error {
	span := trace.SpanFromContext(ctx)

	expiresIn := fmt.Sprintf("%d minutes", lib.OTPExpirationWindowMinutes)

	span.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryInsertOtp),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{lib.RedactPhoneNumber(phoneNumber), hashedOtpCode, expiresIn}),
	)

	result, err := db.ExecContext(
		ctx, queries.QueryInsertOtp,
		phoneNumber, hashedOtpCode, expiresIn,
	)
	if err != nil {
		span.RecordError(err)
		return lib.ErrUnexpected
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		span.RecordError(err)
		return lib.ErrUnexpected
	}

	span.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rowsAffected),
	)

	if rowsAffected == 0 {
		span.AddEvent(lib.EVENT_DB_NO_ROWS_AFFECTED)
		return lib.ErrNotFound
	}

	return nil
}

func GetOtp(db *sqlx.DB, ctx context.Context, phoneNumber string) (*OTPCode, error) {
	otpCode := &OTPCode{}
	err := db.GetContext(ctx, otpCode, queries.QueryGetOtp, phoneNumber)
	if err != nil {
		if err == sql.ErrNoRows {
			slog.Info("Failed to get OTP",
				"error", "invalid phone number",
			)
			return nil, lib.ErrNotFound
		}
		slog.Error(
			"Failed to get OTP",
			"error", err,
		)
		return nil, lib.ErrUnexpected
	}

	return otpCode, nil
}
