package main

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"database/sql"
	"errors"
	"log"
	"math/big"
	"time"

	"github.com/golang-jwt/jwt/v5"

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

func GenerateJwtToken(userId string, expires time.Time, secret string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "banking-user-service",
		"sub": userId,
		"exp": expires.Unix(),
		"iat": time.Now().Unix(),
	})

	return token.SignedString([]byte(secret))
}

func (s *UserServiceServer) RequestAuthentication(_ context.Context, req *pb.RequestAuthenticationRequest) (*pb.Empty, error) {
	tx, err := s.db.Beginx()
	if err != nil {
		log.Printf("Error: failed to create database transaction: %v", err)
		return nil, errors.New("database_error")
	}
	defer tx.Rollback()

	user := User{}
	err = tx.Get(&user, `
		select user_id, phone_number, first_name, last_name, address, created_at, birth_date
		from banking.users
		where phone_number = $1`,
		req.PhoneNumber,
	)
	if err != nil {
		log.Printf("Error: Failed to get user from the database: %v", err)
		return nil, errors.New("user_not_found")
	}

	otpCode, err := GenerateOTPCode()
	if err != nil {
		log.Printf("Error: Failed to generate otp code: %v", err)
		return nil, errors.New("generation_error")
	}

	_, err = tx.Exec(`
		insert into banking.one_time_passcodes (user_id, one_time_passcode)
		values ($1, $2)
		on conflict (user_id) do update
			set one_time_passcode = $2, expires = now() + ('5 minutes')::interval
	`, user.UserId, otpCode)
	if err != nil {
		log.Printf("Error: Failed to write otp code to the database: %v", err)
		return nil, errors.New("database_error")
	}

	err = tx.Commit()
	if err != nil {
		log.Printf("Error: Failed to commit the otp code: %v", err)
		return nil, errors.New("database_error")
	}

	//TODO: remove me
	log.Printf("Issued otp code %s for %s", otpCode, user.UserId)

	return &pb.Empty{}, nil
}

func (s *UserServiceServer) AuthenticateWithOTP(_ context.Context, req *pb.OTPAuthenticationRequest) (*pb.Session, error) {
	tx, err := s.db.Beginx()
	if err != nil {
		log.Printf("Error: failed to create database transaction: %v", err)
		return nil, errors.New("database_error")
	}
	defer tx.Rollback()

	user := User{}
	err = tx.Get(&user, `
		select user_id, phone_number, first_name, last_name, address, created_at, birth_date
		from banking.users
		where phone_number = $1`,
		req.PhoneNumber,
	)
	if err != nil {
		log.Printf("Error: Failed to get user from the database: %v", err)
		return nil, errors.New("user_not_found")
	}

	otpCode := OTPCode{}
	err = tx.Get(&otpCode, `
		select one_time_passcode
		from banking.one_time_passcodes
		where user_id = $1 and expires > now()`,
		user.UserId,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Error: OTP code not found or expired: %v", err)
			return nil, errors.New("otp_not_found")
		}
		log.Printf("Error: Failed to get otp code from the database: %v", err)
		return nil, errors.New("database_error")
	}

	if subtle.ConstantTimeCompare([]byte(otpCode.OTPCode), []byte(req.Code)) != 1 {
		return nil, errors.New("codes_do_not_match")
	}

	err = tx.Commit()
	if err != nil {
		log.Printf("Error: Failed to commit the otp code: %v", err)
		return nil, errors.New("database_error")
	}

	accessTokenExpires := time.Now().Add(5 * time.Minute)
	accessToken, err := GenerateJwtToken(user.UserId, accessTokenExpires, s.config.UserServiceJWTSecret)
	if err != nil {
		log.Printf("Error: failed to generate access token: %v", err)
		return nil, errors.New("token_error")
	}

	refreshTokenExpires := time.Now().Add(10 * time.Minute)
	refreshToken, err := GenerateJwtToken(user.UserId, refreshTokenExpires, s.config.UserServiceJWTSecret)
	if err != nil {
		log.Printf("Error: failed to generate refresh token: %v", err)
		return nil, errors.New("token_error")
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

	accessTokenExpires := time.Now().Add(5 * time.Minute)
	accessToken, err := GenerateJwtToken(userId, accessTokenExpires, s.config.UserServiceJWTSecret)
	if err != nil {
		log.Printf("Error: failed to generate access token: %v", err)
		return nil, errors.New("token_error")
	}

	refreshTokenExpires := time.Now().Add(10 * time.Minute)
	refreshToken, err := GenerateJwtToken(userId, refreshTokenExpires, s.config.UserServiceJWTSecret)
	if err != nil {
		log.Printf("Error: failed to generate refresh token: %v", err)
		return nil, errors.New("token_error")
	}

	return &pb.Session{
		AccessToken:         accessToken,
		RefreshToken:        refreshToken,
		AccessTokenExpires:  accessTokenExpires.UTC().Format(time.RFC3339),
		RefreshTokenExpires: refreshTokenExpires.UTC().Format(time.RFC3339),
	}, nil
}
