package main

import (
	"fmt"
	"log"
	"net"
	pb "protobufs/gen/go/payment-service"
	tbPb "protobufs/gen/go/tigerbeetle-service"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type PaymentServiceServer struct {
	pb.UnimplementedPaymentServiceServer

	config                       *Configuration
	tigerbeetleServiceClient     tbPb.TigerbeetleServiceClient
	tigerbeetleServiceConnection *grpc.ClientConn
}

// func (s *PaymentServiceServer) InitializePayment(_ context.Context, req *pb.InitializePaymentRequest) (*pb.InitializePaymentResponse, error) {

// }

func newServer(config *Configuration) *PaymentServiceServer {
	conn, err := grpc.NewClient(
		config.TigerbeetleServiceUrl,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("Failed to connect to the tigerbeetle service %v", err)
	}
	tigerbeetleClient := tbPb.NewTigerbeetleServiceClient(conn)
	log.Println("Connected to tiger beetle service.")

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
		log.Fatalf("failed to listen: %v", err)
	}
	var opts []grpc.ServerOption
	grpcServer := grpc.NewServer(opts...)
	server := newServer(config)

	pb.RegisterPaymentServiceServer(grpcServer, server)
	grpcServer.Serve(lis)
}
