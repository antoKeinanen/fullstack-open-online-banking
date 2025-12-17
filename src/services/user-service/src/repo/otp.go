package repo

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"user-service/src/lib"
	"user-service/src/queries"

	"github.com/jmoiron/sqlx"
)

type OTPCode struct {
	HashedOTPCode string `db:"one_time_passcode_hash"`
	UserId        string `db:"user_id"`
}

func StoreOTP(db *sqlx.DB, ctx context.Context, phoneNumber, hashedOtpCode string) error {
	result, err := db.ExecContext(
		ctx, queries.QueryInsertOtp,
		phoneNumber, hashedOtpCode,
		fmt.Sprintf("%d minutes", lib.OTPExpirationWindowMinutes),
	)
	if err != nil {
		slog.Error(
			"Failed to store OTP",
			"error", err,
		)
		return lib.ErrUnexpected
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		slog.Error(
			"Failed to get rows affected after storing OTP",
			"error", err,
		)
		return lib.ErrUnexpected
	}
	if rowsAffected == 0 {
		slog.Info("Failed to store OTP",
			"error", "invalid phone number",
		)
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
