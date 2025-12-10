package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"log"
	"math/big"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	pb "protobufs/gen/go/user-service"
)

func GenerateOTPCode() (string, error) {
	otpCode := ""
	for range otpLength {
		num, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		otpCode += num.String()
	}

	return otpCode, nil
}

func DecodeJwtToken(tokenString string, secret string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
}

func GenerateJwtToken(userId string, expires time.Time, secret string, sessionId string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "banking-user-service",
		"sub": userId,
		"exp": expires.Unix(),
		"iat": time.Now().Unix(),
		"sid": sessionId,
	})

	return token.SignedString([]byte(secret))
}

func (s *UserServiceServer) RequestAuthentication(_ context.Context, req *pb.RequestAuthenticationRequest) (*pb.Empty, error) {
	otpCode, err := GenerateOTPCode()
	if err != nil {
		log.Printf("Error: Failed to generate otp code: %v", err)
		return nil, errors.New("generation_error")
	}

	hashedOtpCode, err := GenerateHash(otpCode)
	if err != nil {
		log.Println("Error: failed to generate hash", err)
		return nil, errors.New("hashing_error")
	}

	_, err = s.db.Exec(`
		insert into banking.one_time_passcodes (user_id, one_time_passcode_hash)
		select users.user_id, $2
		from banking.users
		where users.phone_number = $1
		on conflict (user_id) do update
				set one_time_passcode_hash = $2, expires = now() + ('5 minutes')::interval`,
		req.PhoneNumber, hashedOtpCode)
	if err != nil {
		log.Printf("Error: Failed to write otp code to the database: %v", err)
		return nil, errors.New("database_error")
	}

	//TODO: remove me
	log.Printf("Issued otp code %s", otpCode)

	return &pb.Empty{}, nil
}

func (s *UserServiceServer) AuthenticateWithOTP(_ context.Context, req *pb.OTPAuthenticationRequest) (*pb.Session, error) {
	otpCode := OTPCode{}
	err := s.db.Get(&otpCode, `
		with otp_expiry_update as (
				update banking.one_time_passcodes
						set expires = now()
						from banking.users
						where
								users.phone_number = $1
										and users.user_id = one_time_passcodes.user_id
										and one_time_passcodes.expires > now()
						returning one_time_passcode_hash, users.user_id as user_id),
				last_phone_verification_update AS (
						update banking.users
								set last_phone_verification = now()
								where phone_number = $1
										and user_id in (select user_id from otp_expiry_update)
								returning user_id)
		select *
		from otp_expiry_update`,
		req.PhoneNumber,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Error: OTP code not found or expired: %v", err)
			return nil, errors.New("otp_not_found")
		}
		log.Printf("Error: Failed to get otp code from the database: %v", err)
		return nil, errors.New("database_error")
	}

	hashesMatch, err := VerifyHash(otpCode.HashedOTPCode, req.Code)
	if err != nil {
		log.Println("Error: failed to check otp hash validity", err)
		return nil, errors.New("hash_error")
	}

	if !hashesMatch {
		return nil, errors.New("codes_do_not_match")
	}

	sessionId, err := uuid.NewV7()
	if err != nil {
		log.Println("Error: failed to generate sessionId", err)
		return nil, errors.New("session_id_error")
	}

	accessTokenExpires := time.Now().Add(5 * time.Minute)
	accessToken, err := GenerateJwtToken(otpCode.UserId, accessTokenExpires, s.config.UserServiceJWTSecret, sessionId.String())
	if err != nil {
		log.Printf("Error: failed to generate access token: %v", err)
		return nil, errors.New("token_error")
	}

	refreshTokenExpires := time.Now().Add(10 * time.Minute)
	refreshToken, err := GenerateJwtToken(otpCode.UserId, refreshTokenExpires, s.config.UserServiceJWTSecret, sessionId.String())
	if err != nil {
		log.Printf("Error: failed to generate refresh token: %v", err)
		return nil, errors.New("token_error")
	}

	_, err = s.db.Exec(`
		insert into banking.sessions (session_id, user_id, expires, device, application, ip_address)
		values ($1, $2, $3, $4, $5, $6)`,
		sessionId, otpCode.UserId, refreshTokenExpires.UTC().Format(time.RFC3339), req.Device, req.Application, req.IpAddress)
	if err != nil {
		log.Println("Error: failed to register the session", err)
		return nil, errors.New("database_error")
	}

	return &pb.Session{
		AccessToken:         accessToken,
		RefreshToken:        refreshToken,
		AccessTokenExpires:  accessTokenExpires.UTC().Format(time.RFC3339),
		RefreshTokenExpires: refreshTokenExpires.UTC().Format(time.RFC3339),
	}, nil

}

func (s *UserServiceServer) RefreshToken(_ context.Context, session *pb.RefreshTokenRequest) (*pb.Session, error) {
	token, err := DecodeJwtToken(session.RefreshToken, s.config.UserServiceJWTSecret)
	if err != nil {
		log.Printf("Error: Failed to decode token %v", err)
		return nil, errors.New("token_decode_error")
	}

	expiry, err := token.Claims.GetExpirationTime()
	if err != nil {
		log.Printf("Error: Failed to decode token %v", err)
		return nil, errors.New("token_decode_error")
	}

	if expiry.Unix() < time.Now().Unix() {
		log.Printf("Error: Token has expired")
		return nil, errors.New("token_expired")
	}

	userId, err := token.Claims.GetSubject()
	if err != nil {
		log.Printf("Error: Failed to decode token %v", err)
		return nil, errors.New("token_decode_error")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		log.Printf("Error: Failed to get claims from token")
		return nil, errors.New("token_decode_error")
	}

	sessionId, ok := claims["sid"].(string)
	if !ok {
		log.Printf("Error: Failed to get session id from token")
		return nil, errors.New("token_decode_error")
	}

	accessTokenExpires := time.Now().Add(5 * time.Minute)
	accessToken, err := GenerateJwtToken(userId, accessTokenExpires, s.config.UserServiceJWTSecret, sessionId)
	if err != nil {
		log.Printf("Error: failed to generate access token: %v", err)
		return nil, errors.New("token_error")
	}

	refreshTokenExpires := time.Now().Add(10 * time.Minute)
	refreshToken, err := GenerateJwtToken(userId, refreshTokenExpires, s.config.UserServiceJWTSecret, sessionId)
	if err != nil {
		log.Printf("Error: failed to generate refresh token: %v", err)
		return nil, errors.New("token_error")
	}

	result, err := s.db.Exec(`
		update banking.sessions
		set expires = $1
		where session_id = $2 AND expires > now()`,
		refreshTokenExpires.UTC().Format(time.RFC3339), sessionId)
	if err != nil {
		log.Println("Error: failed to register the session", err)
		return nil, errors.New("database_error")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Println("Error: failed to register the session", err)
		return nil, errors.New("database_error")
	}
	if rowsAffected == 0 {
		return nil, errors.New("token_expired")
	}

	return &pb.Session{
		AccessToken:         accessToken,
		RefreshToken:        refreshToken,
		AccessTokenExpires:  accessTokenExpires.UTC().Format(time.RFC3339),
		RefreshTokenExpires: refreshTokenExpires.UTC().Format(time.RFC3339),
	}, nil
}

func (s *UserServiceServer) GetActiveSessions(_ context.Context, req *pb.GetActiveSessionsRequest) (*pb.GetActiveSessionsResponse, error) {
	rows, err := s.db.Queryx(`
		select session_id, expires, created_at, device, application, ip_address
		from banking.sessions
		where user_id = $1 and expires > now()
		`, req.UserId)
	if err != nil {
		log.Println("Error: Failed to get active sessions", err)
		return nil, errors.New("database_error")
	}
	defer rows.Close()

	var activeSessions []*pb.ActiveSession
	for rows.Next() {
		session := ActiveSession{}
		if err := rows.StructScan(&session); err != nil {
			log.Println("Error: Failed to get active sessions", err)
			return nil, errors.New("database_error")
		}

		activeSessions = append(activeSessions, DbActiveSessionToPbActiveSession(session))
	}

	return &pb.GetActiveSessionsResponse{
		Sessions: activeSessions,
	}, nil
}

func (s *UserServiceServer) InvalidateSession(_ context.Context, req *pb.InvalidateSessionRequest) (*pb.Empty, error) {
	_, err := s.db.Exec(`update banking.sessions
		set expires = now()
		where session_id = $1 and user_id = $2
		`, req.SessionId, req.UserId)
	if err != nil {
		log.Println("Failed to invalidate session", err)
		return nil, errors.New("database_error")
	}

	return &pb.Empty{}, nil
}
