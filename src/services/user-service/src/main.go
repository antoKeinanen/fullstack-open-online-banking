package main

import (
	"fmt"
	"log"
	"net"
	tbPb "protobufs/gen/go/tigerbeetle-service"
	pb "protobufs/gen/go/user-service"

	"user-service/src/lib"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type UserServiceServer struct {
	pb.UnimplementedUserServiceServer
	db                           *sqlx.DB
	config                       *lib.Configuration
	tigerbeetleService           tbPb.TigerbeetleServiceClient
	tigerbeetleServiceConnection *grpc.ClientConn
	tokenService                 *lib.TokenService
}

func newServer(config *lib.Configuration) *UserServiceServer {
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

	tokenService := lib.NewTokenService(config.UserServiceJWTSecret)

	return &UserServiceServer{
		db:                           db,
		config:                       config,
		tigerbeetleServiceConnection: conn,
		tigerbeetleService:           client,
		tokenService:                 tokenService,
	}
}

func main() {
	config := lib.ParseConfiguration()
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
