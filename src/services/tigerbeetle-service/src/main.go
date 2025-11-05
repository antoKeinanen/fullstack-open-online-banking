package main

import (
	"fmt"
	"log"
	"net"

	pb "protobufs/gen/go/tigerbeetle-service"

	"google.golang.org/grpc"

	tb "github.com/tigerbeetle/tigerbeetle-go"
	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

type TigerbeetleServiceServer struct {
	pb.UnimplementedTigerbeetleServiceServer
	tbClient tb.Client
}

func newServer(configuration *Configuration) *TigerbeetleServiceServer {
	s := &TigerbeetleServiceServer{}

	client, err := tb.NewClient(tbt.ToUint128(0), []string{configuration.TigerbeetleAddress})
	if err != nil {
		log.Panicf("Error creating client: %s", err)
	}
	s.tbClient = client

	return s
}

func main() {
	configuration := ParseConfiguration()

	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%s", configuration.TigerbeetleServicePort))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	var opts []grpc.ServerOption
	grpcServer := grpc.NewServer(opts...)
	server := newServer(configuration)
	defer server.tbClient.Close()

	pb.RegisterTigerbeetleServiceServer(grpcServer, server)
	grpcServer.Serve(lis)
}
