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

	accessTokenExpires := time.Now().Add(5 * time.Minute)
	accessToken, err := GenerateJwtToken(otpCode.UserId, accessTokenExpires, s.config.UserServiceJWTSecret)
	if err != nil {
		log.Printf("Error: failed to generate access token: %v", err)
		return nil, errors.New("token_error")
	}

	refreshTokenExpires := time.Now().Add(10 * time.Minute)
	refreshToken, err := GenerateJwtToken(otpCode.UserId, refreshTokenExpires, s.config.UserServiceJWTSecret)
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
