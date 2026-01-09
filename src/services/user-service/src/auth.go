package main

import (
	"context"
	"log/slog"
	"time"

	"user-service/src/lib"
	"user-service/src/queries"
	"user-service/src/repo"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	pb "protobufs/gen/go/user-service"
)

func (s *UserServiceServer) RequestAuthentication(ctx context.Context, req *pb.RequestAuthenticationRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	otpCode, err := lib.GenerateOTPCode()
	if err != nil {
		span.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	ctx, hashOtpSpan := tracer.Start(ctx, lib.EVENT_OTP_HASH)
	defer hashOtpSpan.End()

	hashedOtpCode, err := lib.GenerateHash(otpCode)
	if err != nil {
		hashOtpSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	hashOtpSpan.End()

	ctx, storeOtpSpan := tracer.Start(ctx, lib.EVENT_OTP_STORE)
	defer storeOtpSpan.End()

	err = repo.StoreOTP(s.db, ctx, req.PhoneNumber, hashedOtpCode)
	if err != nil {
		return nil, err
	}
	storeOtpSpan.End()

	//TODO: remove me
	slog.Info("Issued otp code", "code", otpCode)

	return &pb.Empty{}, nil
}

func (s *UserServiceServer) AuthenticateWithOTP(ctx context.Context, req *pb.OTPAuthenticationRequest) (*pb.Session, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	ctx, getOtpSpan := tracer.Start(ctx, lib.EVENT_OTP_GET)
	defer getOtpSpan.End()

	otpCode, err := repo.GetOtp(s.db, ctx, req.PhoneNumber)
	if err != nil {
		return nil, err
	}
	getOtpSpan.End()

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, otpCode.UserId),
	)

	ctx, verifyOtpSpan := tracer.Start(ctx, lib.EVENT_OTP_VERIFY)
	defer verifyOtpSpan.End()

	hashesMatch, err := lib.VerifyHash(otpCode.HashedOTPCode, req.Code)
	if err != nil {
		verifyOtpSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if !hashesMatch {
		verifyOtpSpan.AddEvent(lib.EVENT_OTP_HASH_MISMATCH)
		return nil, lib.ErrOTPMismatch
	}
	verifyOtpSpan.End()

	sessionId, err := uuid.NewV7()
	if err != nil {
		span.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	span.SetAttributes(
		attribute.String(lib.ATTR_SESSION_ID, sessionId.String()),
	)

	ctx, generateTokenPairSpan := tracer.Start(ctx, lib.EVENT_GENERATE_TOKEN_PAIR)
	defer generateTokenPairSpan.End()

	tokenPair, err := s.tokenService.GenerateTokenPair(otpCode.UserId, sessionId.String())
	if err != nil {
		generateTokenPairSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	generateTokenPairSpan.End()

	ctx, storeSessionSpan := tracer.Start(ctx, lib.EVENT_SESSION_STORE)
	defer storeSessionSpan.End()

	storeSessionSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryInsertSession),
		attribute.StringSlice(lib.ATTR_DB_ARGS,
			[]string{
				sessionId.String(),
				otpCode.UserId,
				tokenPair.RefreshTokenExpires.UTC().Format(time.RFC3339),
				req.Device,
				req.Application,
				req.IpAddress,
			},
		),
	)

	result, err := s.db.ExecContext(
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
		storeSessionSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		storeSessionSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	storeSessionSpan.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rowsAffected),
	)
	storeSessionSpan.End()

	return &pb.Session{
		AccessToken:         tokenPair.AccessToken,
		RefreshToken:        tokenPair.RefreshToken,
		AccessTokenExpires:  tokenPair.AccessTokenExpires.UTC().Format(time.RFC3339),
		RefreshTokenExpires: tokenPair.RefreshTokenExpires.UTC().Format(time.RFC3339),
	}, nil
}

func (s *UserServiceServer) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.Session, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_REFRESH_TOKEN, lib.RedactJWT(req.RefreshToken)),
	)

	ctx, decodeTokenSpan := tracer.Start(ctx, lib.EVENT_DECODE_TOKEN)
	defer decodeTokenSpan.End()

	token, err := s.tokenService.DecodeAndValidate(req.RefreshToken)
	if err != nil {
		if err == lib.ErrTokenExpired {
			decodeTokenSpan.AddEvent(lib.EVENT_TOKEN_EXPIRED)
			return nil, err
		}

		decodeTokenSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, token.UserId),
		attribute.String(lib.ATTR_SESSION_ID, token.SessionId),
	)

	ctx, generateTokenPairSpan := tracer.Start(ctx, lib.EVENT_GENERATE_TOKEN_PAIR)
	defer generateTokenPairSpan.End()

	tokenPair, err := s.tokenService.GenerateTokenPair(token.UserId, token.SessionId)
	if err != nil {
		generateTokenPairSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	generateTokenPairSpan.End()

	ctx, storeSessionSpan := tracer.Start(ctx, lib.EVENT_SESSION_STORE)
	defer storeSessionSpan.End()

	storeSessionSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryRefreshSession),
		attribute.StringSlice(lib.ATTR_DB_ARGS,
			[]string{
				tokenPair.RefreshTokenExpires.UTC().Format(time.RFC3339),
				token.SessionId,
			},
		),
	)

	result, err := s.db.ExecContext(
		ctx,
		queries.QueryRefreshSession,
		tokenPair.RefreshTokenExpires,
		token.SessionId,
	)
	if err != nil {
		storeSessionSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		storeSessionSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if rowsAffected == 0 {
		storeSessionSpan.AddEvent(lib.EVENT_DB_NO_ROWS_AFFECTED)
		return nil, lib.ErrTokenExpired
	}

	storeSessionSpan.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rowsAffected),
	)

	return &pb.Session{
		AccessToken:         tokenPair.AccessToken,
		RefreshToken:        tokenPair.RefreshToken,
		AccessTokenExpires:  tokenPair.AccessTokenExpires.UTC().Format(time.RFC3339),
		RefreshTokenExpires: tokenPair.RefreshTokenExpires.UTC().Format(time.RFC3339),
	}, nil
}

func (s *UserServiceServer) GetActiveSessions(ctx context.Context, req *pb.GetActiveSessionsRequest) (*pb.GetActiveSessionsResponse, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
	)

	ctx, getSessionsSpan := tracer.Start(ctx, lib.EVENT_SESSION_GET)
	defer getSessionsSpan.End()

	rows, err := s.db.QueryxContext(ctx, queries.QueryGetActiveSessions, req.UserId)
	if err != nil {
		getSessionsSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	defer rows.Close()

	var activeSessions []*pb.ActiveSession
	for rows.Next() {
		session := repo.ActiveSession{}
		if err := rows.StructScan(&session); err != nil {
			getSessionsSpan.RecordError(err)
			return nil, lib.ErrUnexpected
		}
		activeSessions = append(activeSessions, repo.DbActiveSessionToPbActiveSession(session))
	}
	if err := rows.Err(); err != nil {
		getSessionsSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	getSessionsSpan.End()

	return &pb.GetActiveSessionsResponse{
		Sessions: activeSessions,
	}, nil
}

func (s *UserServiceServer) InvalidateSession(ctx context.Context, req *pb.InvalidateSessionRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)

	span.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryInvalidateSession),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.SessionId, req.UserId}),
	)

	_, err := s.db.ExecContext(ctx, queries.QueryInvalidateSession, req.SessionId, req.UserId)
	if err != nil {
		span.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	return &pb.Empty{}, nil
}
