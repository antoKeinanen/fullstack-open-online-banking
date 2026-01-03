package main

import (
	"fmt"
	"log/slog"
	"net"
	pb "protobufs/gen/go/stripe-service"
	tbPb "protobufs/gen/go/tigerbeetle-service"

	"stripe-service/src/lib"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type StripeServiceServer struct {
	pb.UnimplementedStripeServiceServer
	db                           *sqlx.DB
	config                       *lib.Configuration
	tigerbeetleService           tbPb.TigerbeetleServiceClient
	tigerbeetleServiceConnection *grpc.ClientConn
}

func newServer(config *lib.Configuration) *StripeServiceServer {
	db, err := sqlx.Connect("postgres", config.StripeServiceDatabaseDsn)
	if err != nil {

		slog.Error("Failed to connect to the database", "error", err)
		panic(err)
	}
	slog.Info("Connected to db")

	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}

	conn, err := grpc.NewClient(config.TigerbeetleServiceUrl, opts...)
	if err != nil {
		slog.Error("Failed to open Tigerbeetle service grpc connection", "error", err)
		panic(err)
	}
	client := tbPb.NewTigerbeetleServiceClient(conn)
	slog.Info("Connected to Tigerbeetle service grpc")

	return &StripeServiceServer{
		db:                           db,
		config:                       config,
		tigerbeetleServiceConnection: conn,
		tigerbeetleService:           client,
	}
}

func main() {
	config := lib.ParseConfiguration()
	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%s", config.StripeServicePort))
	if err != nil {
		slog.Error("Failed to listen", "error", err)
		panic(err)
	}

	var opts []grpc.ServerOption
	grpcServer := grpc.NewServer(opts...)

	server := newServer(config)
	defer server.db.Close()
	defer server.tigerbeetleServiceConnection.Close()

	pb.RegisterStripeServiceServer(grpcServer, server)
	grpcServer.Serve(lis)
}
