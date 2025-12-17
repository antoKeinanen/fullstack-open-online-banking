package main

import (
	"context"
	"log/slog"
	"time"

	"user-service/src/lib"
	"user-service/src/queries"
	"user-service/src/repo"

	"github.com/google/uuid"

	pb "protobufs/gen/go/user-service"
)

func (s *UserServiceServer) RequestAuthentication(ctx context.Context, req *pb.RequestAuthenticationRequest) (*pb.Empty, error) {
	otpCode, err := lib.GenerateOTPCode()
	if err != nil {
		slog.Error(
			"Failed to generate otp code",
			"error", err,
		)
		return nil, lib.ErrUnexpected
	}

	hashedOtpCode, err := lib.GenerateHash(otpCode)
	if err != nil {
		slog.Error(
			"Failed to hash otp code",
			"error", err,
		)
		return nil, lib.ErrUnexpected
	}

	err = repo.StoreOTP(s.db, ctx, req.PhoneNumber, hashedOtpCode)
	if err != nil {
		return nil, err
	}

	//TODO: remove me
	slog.Info("Issued otp code", "code", otpCode)

	return &pb.Empty{}, nil
}

func (s *UserServiceServer) AuthenticateWithOTP(ctx context.Context, req *pb.OTPAuthenticationRequest) (*pb.Session, error) {
	otpCode, err := repo.GetOtp(s.db, ctx, req.PhoneNumber)
	if err != nil {
		return nil, err
	}

	hashesMatch, err := lib.VerifyHash(otpCode.HashedOTPCode, req.Code)
	if err != nil {
		slog.Error(
			"Failed to verify otp hash",
			"error", err,
		)
		return nil, lib.ErrUnexpected
	}
	if !hashesMatch {
		return nil, lib.ErrOTPMismatch
	}

	sessionId, err := uuid.NewV7()
	if err != nil {
		slog.Error(
			"Failed to generate uuid v7",
			"error", err,
		)
		return nil, lib.ErrUnexpected
	}

	tokenPair, err := s.tokenService.GenerateTokenPair(otpCode.UserId, sessionId.String())
	if err != nil {
		slog.Error(
			"Failed to generate token pair",
			"error", err,
		)
		return nil, lib.ErrUnexpected
	}

	_, err = s.db.ExecContext(
		ctx,
		queries.QueryInsertSession,
		sessionId,
		otpCode.UserId,
		tokenPair.RefreshTokenExpires.UTC().Format(time.RFC3339),
		req.Device,
		req.Application,
		req.IpAddress,
	)
	if err != nil {
		slog.Error("Failed to register the session", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.Session{
		AccessToken:         tokenPair.AccessToken,
		RefreshToken:        tokenPair.RefreshToken,
		AccessTokenExpires:  tokenPair.AccessTokenExpires.UTC().Format(time.RFC3339),
		RefreshTokenExpires: tokenPair.RefreshTokenExpires.UTC().Format(time.RFC3339),
	}, nil
}

func (s *UserServiceServer) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.Session, error) {
	token, err := s.tokenService.DecodeAndValidate(req.RefreshToken)
	if err != nil {
		if err == lib.ErrTokenExpired {
			return nil, err
		}

		slog.Error(
			"Failed to validate and decode refresh token",
			"error", err,
		)
		return nil, lib.ErrUnexpected
	}

	tokenPair, err := s.tokenService.GenerateTokenPair(token.UserId, token.SessionId)
	if err != nil {
		slog.Error(
			"Failed to generate token pair",
			"error", err,
		)
		return nil, lib.ErrUnexpected
	}

	result, err := s.db.ExecContext(
		ctx,
		queries.QueryRefreshSession,
		tokenPair.RefreshTokenExpires,
		token.SessionId,
	)
	if err != nil {
		slog.Error("Failed to register the session", "error", err)
		return nil, lib.ErrUnexpected
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		slog.Error("Failed to refresh the session", "error", err)
		return nil, lib.ErrUnexpected
	}
	if rowsAffected == 0 {
		return nil, lib.ErrTokenExpired
	}

	return &pb.Session{
		AccessToken:         tokenPair.AccessToken,
		RefreshToken:        tokenPair.RefreshToken,
		AccessTokenExpires:  tokenPair.AccessTokenExpires.UTC().Format(time.RFC3339),
		RefreshTokenExpires: tokenPair.RefreshTokenExpires.UTC().Format(time.RFC3339),
	}, nil
}

func (s *UserServiceServer) GetActiveSessions(ctx context.Context, req *pb.GetActiveSessionsRequest) (*pb.GetActiveSessionsResponse, error) {
	rows, err := s.db.QueryxContext(ctx, queries.QueryGetActiveSessions, req.UserId)
	if err != nil {
		slog.Error("Failed to get active sessions", "error", err)
		return nil, lib.ErrUnexpected
	}
	defer rows.Close()

	var activeSessions []*pb.ActiveSession
	for rows.Next() {
		session := repo.ActiveSession{}
		if err := rows.StructScan(&session); err != nil {
			slog.Error("Failed to get active sessions", "error", err)
			return nil, lib.ErrUnexpected
		}
		activeSessions = append(activeSessions, repo.DbActiveSessionToPbActiveSession(session))
	}
	if err := rows.Err(); err != nil {
		slog.Error("Failed to get active sessions", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.GetActiveSessionsResponse{
		Sessions: activeSessions,
	}, nil
}

func (s *UserServiceServer) InvalidateSession(ctx context.Context, req *pb.InvalidateSessionRequest) (*pb.Empty, error) {
	_, err := s.db.ExecContext(ctx, queries.QueryInvalidateSession, req.SessionId, req.UserId)
	if err != nil {
		slog.Error("Failed to invalidate session", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.Empty{}, nil
}
