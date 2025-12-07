package main

import (
	"fmt"
	"log"
	"net"
	tbPb "protobufs/gen/go/tigerbeetle-service"
	pb "protobufs/gen/go/user-service"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	otpLength = 6
)

type UserServiceServer struct {
	pb.UnimplementedUserServiceServer
	db                           *sqlx.DB
	config                       *Configuration
	tigerbeetleService           tbPb.TigerbeetleServiceClient
	tigerbeetleServiceConnection *grpc.ClientConn
}

type User struct {
	UserId      string    `db:"user_id"`
	PhoneNumber string    `db:"phone_number"`
	FirstName   string    `db:"first_name"`
	LastName    string    `db:"last_name"`
	Address     string    `db:"address"`
	BirthDate   time.Time `db:"birth_date"`
	CreatedAt   time.Time `db:"created_at"`
}

type OTPCode struct {
	OTPCode string `db:"one_time_passcode"`
	UserId  string `db:"user_id"`
}

func newServer(config *Configuration) *UserServiceServer {
	// TODO: preform connections concurrently
	db, err := sqlx.Connect("postgres", config.UserServiceDatabaseDsn)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	log.Println("Connected to db")

	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}

	conn, err := grpc.NewClient(config.TigerbeetleServiceUrl, opts...)
	if err != nil {
		log.Fatalln("Failed to open Tigerbeetle service grpc connection:", err)
	}
	client := tbPb.NewTigerbeetleServiceClient(conn)
	log.Println("Connected to Tigerbeetle service grpc")

	return &UserServiceServer{
		db:                           db,
		config:                       config,
		tigerbeetleServiceConnection: conn,
		tigerbeetleService:           client,
	}
}

func main() {
	config := ParseConfiguration()
	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%s", config.UserServicePort))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	var opts []grpc.ServerOption
	grpcServer := grpc.NewServer(opts...)

	server := newServer(config)
	defer server.db.Close()
	defer server.tigerbeetleServiceConnection.Close()

	pb.RegisterUserServiceServer(grpcServer, server)
	grpcServer.Serve(lis)
}
