package main

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log"
	"math/big"
	"net"
	"os"
	pb "protobufs/gen/go/user-service"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
)

var (
	port      = flag.Int("port", 50052, "The server port")
	otpLength = 6
)

type UserServiceServer struct {
	pb.UnimplementedUserServiceServer
	db        *sqlx.DB
	jwtSecret string
}

type User struct {
	UserId      string    `db:"user_id"`
	PhoneNumber string    `db:"phone_number"`
	FirstName   string    `db:"first_name"`
	LastName    string    `db:"last_name"`
	Address     string    `db:"address"`
	CreatedAt   time.Time `db:"created_at"`
}

type OTPCode struct {
	OTPCode string `db:"one_time_passcode"`
}

func DbUserToPbUser(dbUser User) *pb.User {
	return &pb.User{
		UserId:      dbUser.UserId,
		PhoneNumber: dbUser.PhoneNumber,
		FirstName:   dbUser.FirstName,
		LastName:    dbUser.LastName,
		Address:     dbUser.Address,
		CreatedAt:   dbUser.CreatedAt.Format(time.RFC3339),
	}
}

func (s *UserServiceServer) CreateUser(_ context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
	tx, err := s.db.Beginx()
	if err != nil {
		log.Printf("Error: failed to create database transaction: %v", err)
		return nil, errors.New("database_error")
	}

	user := User{}
	err = tx.Get(&user,
		`INSERT INTO banking.users
		(phone_number, first_name, last_name, address) 
		VALUES ($1,$2,$3,$4) 
		RETURNING user_id, phone_number, first_name, last_name, address
	`,
		req.PhoneNumber, req.FirstName, req.LastName, req.Address,
	)
	if err != nil {
		log.Printf("Error: Failed to insert user to the database: %v", err)
		return nil, errors.New("database_insert_failed")
	}

	//TODO: also create an account in tigerbeetle and cancel on failure

	err = tx.Commit()
	if err != nil {
		log.Printf("Error: Failed to commit new user to the database: %v", err)
		return nil, errors.New("create_failure")
	}

	return DbUserToPbUser(user), nil
}

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

func (s *UserServiceServer) RequestAuthentication(_ context.Context, req *pb.RequestAuthenticationRequest) (*pb.Empty, error) {
	tx, err := s.db.Beginx()
	if err != nil {
		log.Printf("Error: failed to create database transaction: %v", err)
		return nil, errors.New("database_error")
	}

	user := User{}
	err = tx.Get(&user, `
		select user_id, phone_number, first_name, last_name, address, created_at
		from banking.users
		where phone_number = $1`,
		req.PhoneNumber,
	)
	if err != nil {
		log.Printf("Error: Failed to get user from the database: %v", err)
		return nil, errors.New("database_error")
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

func GenerateJwtToken(userId string, expires time.Time, secret string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "banking-user-service",
		"sub": userId,
		"exp": expires.Unix(),
		"iat": time.Now().Unix(),
	})

	return token.SignedString([]byte(secret))
}

func DecodeJwtToken(tokenString string, secret string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
}

func (s *UserServiceServer) AuthenticateWithOTP(_ context.Context, req *pb.OTPAuthenticationRequest) (*pb.Session, error) {
	tx, err := s.db.Beginx()
	if err != nil {
		log.Printf("Error: failed to create database transaction: %v", err)
		return nil, errors.New("database_error")
	}

	user := User{}
	err = tx.Get(&user, `
		select user_id, phone_number, first_name, last_name, address, created_at
		from banking.users
		where phone_number = $1`,
		req.PhoneNumber,
	)
	if err != nil {
		log.Printf("Error: Failed to get user from the database: %v", err)
		return nil, errors.New("database_error")
	}

	otpCode := OTPCode{}
	err = tx.Get(&otpCode, `
		select one_time_passcode
		from banking.one_time_passcodes
		where user_id = $1 and expires > now()`,
		user.UserId,
	)
	if err != nil {

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

	accessToken, err := GenerateJwtToken(user.UserId, time.Now().Add(5*time.Minute), s.jwtSecret)
	if err != nil {
		log.Printf("Error: failed to generate access token: %v", err)
		return nil, errors.New("token_error")
	}

	refreshToken, err := GenerateJwtToken(user.UserId, time.Now().Add(10*time.Minute), s.jwtSecret)
	if err != nil {
		log.Printf("Error: failed to generate refresh token: %v", err)
		return nil, errors.New("token_error")
	}

	return &pb.Session{AccessToken: accessToken, RefreshToken: refreshToken}, nil

}

func (s *UserServiceServer) RefreshToken(_ context.Context, session *pb.Session) (*pb.Session, error) {
	token, err := DecodeJwtToken(session.RefreshToken, s.jwtSecret)
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

	accessToken, err := GenerateJwtToken(userId, time.Now().Add(5*time.Minute), s.jwtSecret)
	if err != nil {
		log.Printf("Error: failed to generate access token: %v", err)
		return nil, errors.New("token_error")
	}

	refreshToken, err := GenerateJwtToken(userId, time.Now().Add(10*time.Minute), s.jwtSecret)
	if err != nil {
		log.Printf("Error: failed to generate refresh token: %v", err)
		return nil, errors.New("token_error")
	}

	return &pb.Session{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func (s *UserServiceServer) GetUserById(_ context.Context, req *pb.GetUserByIdRequest) (*pb.User, error) {
	user := User{}
	err := s.db.Get(&user, `
		select user_id, phone_number, first_name, last_name, address, created_at
		from banking.users
		where user_id = $1`,
		req.UserId,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Error: User not found: %v", err)
			return nil, errors.New("user_not_found")
		}

		log.Printf("Error: Failed to get user from the database: %v", err)
		return nil, errors.New("database_error")
	}

	return DbUserToPbUser(user), nil
}

func (s *UserServiceServer) GetUsersPaginated(_ context.Context, req *pb.GetUsersPaginatedRequest) (*pb.GetUsersPaginatedResponse, error) {
	rows, err := s.db.Queryx(`
		select user_id, phone_number, first_name, last_name, address, created_at
		from banking.users
		order by user_id
		offset $1
		limit $2
	`, req.Offset, req.Take)
	if err != nil {
		log.Printf("Error: Failed to get users from the database: %v", err)
		return nil, errors.New("database_error")
	}
	var users []*pb.User
	for rows.Next() {
		user := User{}
		if err := rows.StructScan(&user); err != nil {
			log.Printf("Error: Failed to get users from the database: %v", err)
			return nil, errors.New("database_error")
		}
		users = append(users, DbUserToPbUser(user))
	}

	return &pb.GetUsersPaginatedResponse{
		Users: users,
		Count: 0,
	}, nil
}

func newServer() *UserServiceServer {
	s := &UserServiceServer{}

	db, err := sqlx.Connect("postgres", "port=26257 user=admin_development dbname=defaultdb sslmode=disable")
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	s.db = db
	log.Println("Connected to db")

	jwtSecret := os.Getenv("JWT_SECRET")
	s.jwtSecret = jwtSecret

	return s
}

func main() {
	flag.Parse()
	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%d", *port))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	var opts []grpc.ServerOption
	grpcServer := grpc.NewServer(opts...)
	server := newServer()
	defer server.db.Close()

	pb.RegisterUserServiceServer(grpcServer, server)
	grpcServer.Serve(lis)
}
