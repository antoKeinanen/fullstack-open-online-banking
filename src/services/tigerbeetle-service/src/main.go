package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"os"

	pb "protobufs/generated/go/tigerbeetle"

	"google.golang.org/grpc"

	tb "github.com/tigerbeetle/tigerbeetle-go"
	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

var (
	port = flag.Int("port", 50051, "The server port")
)

type TigerbeetleServiceServer struct {
	pb.UnimplementedTigerbeetleServiceServer
	tbClient tb.Client
}

func newServer() *TigerbeetleServiceServer {
	s := &TigerbeetleServiceServer{}

	tbAddress := os.Getenv("TB_ADDRESS")
	if len(tbAddress) == 0 {
		tbAddress = "3001"
	}
	client, err := tb.NewClient(tbt.ToUint128(0), []string{tbAddress})
	if err != nil {
		log.Panicf("Error creating client: %s", err)
	}
	s.tbClient = client

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
	defer server.tbClient.Close()

	pb.RegisterTigerbeetleServiceServer(grpcServer, server)
	grpcServer.Serve(lis)
}
