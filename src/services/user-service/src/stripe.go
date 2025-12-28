package main

import (
	"context"
	"log/slog"
	pb "protobufs/gen/go/user-service"
	"user-service/src/lib"
	"user-service/src/queries"
	"user-service/src/repo"
)

func (s *UserServiceServer) SetStripeCustomerId(ctx context.Context, req *pb.SetStripeCustomerIdRequest) (*pb.Empty, error) {
	_, err := s.db.ExecContext(ctx, queries.QuerySetStripeCustomerId, req.StripeCustomerId, req.UserId)
	if err != nil {
		slog.Error("Failed to set stripe customer id", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.Empty{}, nil
}

func (s *UserServiceServer) GetStripeCustomerId(ctx context.Context, req *pb.GetStripeCustomerIdRequest) (*pb.GetStripeCustomerIdReponse, error) {
	stripeCustomerId := repo.StripeCustomerId{}
	err := s.db.GetContext(ctx, &stripeCustomerId, queries.QueryGetStripeCustomerId, req.UserId)
	if err != nil {
		slog.Error("Failed to get stripe customer id", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.GetStripeCustomerIdReponse{
		StripeCustomerId: stripeCustomerId.StripeCustomerId,
	}, nil
}
