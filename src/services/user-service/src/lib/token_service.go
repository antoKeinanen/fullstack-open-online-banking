package lib

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenPair struct {
	AccessToken        string
	AccessTokenExpires time.Time

	RefreshToken        string
	RefreshTokenExpires time.Time
}

type TokenClaims struct {
	UserId    string
	SessionId string
}

type TokenService struct {
	secret string
}

func NewTokenService(secret string) *TokenService {
	return &TokenService{secret: secret}
}

func (ts *TokenService) GenerateTokenPair(userId, sessionId string) (*TokenPair, error) {
	accessToken, accessTokenExpires, err := ts.generateToken(userId, sessionId, AccessTokenTTL)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	refreshToken, refreshTokenExpires, err := ts.generateToken(userId, sessionId, RefreshTokenTTL)
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:         accessToken,
		AccessTokenExpires:  accessTokenExpires,
		RefreshToken:        refreshToken,
		RefreshTokenExpires: refreshTokenExpires,
	}, nil
}

func (ts *TokenService) generateToken(userId, sessionId string, ttl time.Duration) (string, time.Time, error) {
	expires := time.Now().Add(ttl)
	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "banking-user-service",
		"sub": userId,
		"exp": expires.Unix(),
		"iat": time.Now().Unix(),
		"sid": sessionId,
	})

	token, err := jwtToken.SignedString([]byte(ts.secret))

	return token, expires, err
}

func (ts *TokenService) DecodeAndValidate(tokenString string) (*TokenClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return []byte(ts.secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	expiry, err := token.Claims.GetExpirationTime()
	if err != nil {
		return nil, fmt.Errorf("get expiration: %w", err)
	}
	if expiry.Unix() < time.Now().Unix() {
		return nil, ErrTokenExpired
	}

	userId, err := token.Claims.GetSubject()
	if err != nil {
		return nil, fmt.Errorf("get user id: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	sessionId, ok := claims["sid"].(string)
	if !ok {
		return nil, fmt.Errorf("missing session id")
	}

	return &TokenClaims{
		UserId:    userId,
		SessionId: sessionId,
	}, nil

}
