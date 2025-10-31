package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net"

	pb "protobufs/generated/go"

	"google.golang.org/grpc"
)

var (
	port = flag.Int("port", 50051, "The server port")
)

type tigerbeetleServiceServer struct {
	pb.UnimplementedTigerbeetleServiceServer
}

func CreateEmptyInt128(upper uint64, lower uint64) pb.Uint128 {
	return pb.Uint128{
		Upper: upper,
		Lower: lower,
	}
}

func (s *tigerbeetleServiceServer) LookupAccount(_ context.Context, account_id *pb.Uint128) (*pb.Account, error) {
	one := CreateEmptyInt128(0, 1)
	return &pb.Account{
		AccountId:      account_id,
		DebitsPending:  &one,
		DebitsPosted:   &one,
		CreditsPending: &one,
		CreditsPosted:  &one,
	}, nil
}

func (s *tigerbeetleServiceServer) CreateAccount(_ context.Context, _ *pb.Account) (*pb.Account, error) {
	one := CreateEmptyInt128(0, 1)
	return &pb.Account{
		AccountId:      &one,
		DebitsPending:  &one,
		DebitsPosted:   &one,
		CreditsPending: &one,
		CreditsPosted:  &one,
	}, nil
}

func newServer() *tigerbeetleServiceServer {
	s := &tigerbeetleServiceServer{}
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
	pb.RegisterTigerbeetleServiceServer(grpcServer, newServer())
	grpcServer.Serve(lis)
}
