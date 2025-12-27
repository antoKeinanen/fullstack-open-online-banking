package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	pb "protobufs/gen/go/payment-service"
	tbPb "protobufs/gen/go/tigerbeetle-service"

	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type PaymentServiceServer struct {
	pb.UnimplementedPaymentServiceServer

	config                       *Configuration
	tigerbeetleServiceClient     tbPb.TigerbeetleServiceClient
	tigerbeetleServiceConnection *grpc.ClientConn
}

func (s *PaymentServiceServer) CreatePayment(ctx context.Context, req *pb.CreatePaymentRequest) (*pb.CreatePaymentResponse, error) {
	amount := tbt.ToUint128(req.Amount).String()

	_, err := s.tigerbeetleServiceClient.CreateTransfer(
		ctx,
		&tbPb.CreateTransferRequest{
			CreditAccountId: req.FromUserId,
			DebitAccountId:  req.ToUserId,
			Amount:          amount,
		},
	)

	if err != nil {
		slog.Error("Failed to create payment", "error", err)
		return nil, err
	}

	return &pb.CreatePaymentResponse{}, nil

}

func newServer(config *Configuration) *PaymentServiceServer {
	conn, err := grpc.NewClient(
		config.TigerbeetleServiceUrl,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		slog.Error("Failed to connect to the tigerbeetle service", "error", err)
		panic(err)
	}
	tigerbeetleClient := tbPb.NewTigerbeetleServiceClient(conn)
	slog.Info("Connected to tiger beetle service.")

	s := &PaymentServiceServer{
		config:                       config,
		tigerbeetleServiceClient:     tigerbeetleClient,
		tigerbeetleServiceConnection: conn,
	}

	return s
}

func main() {
	config := ParseConfiguration()

	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%s", config.PaymentServicePort))
	if err != nil {
		slog.Error("failed to listen", "error", err)
		panic(err)
	}
	var opts []grpc.ServerOption
	grpcServer := grpc.NewServer(opts...)
	server := newServer(config)

	pb.RegisterPaymentServiceServer(grpcServer, server)
	grpcServer.Serve(lis)
}
