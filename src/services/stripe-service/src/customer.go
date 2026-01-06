package main

import (
	"context"
	"database/sql"
	"log/slog"
	pb "protobufs/gen/go/stripe-service"
	"stripe-service/src/lib"
	"stripe-service/src/queries"
	"stripe-service/src/repo"
)

func (s *StripeServiceServer) SetStripeCustomerId(ctx context.Context, req *pb.SetStripeCustomerIdRequest) (*pb.Empty, error) {
	_, err := s.db.ExecContext(ctx, queries.QuerySetStripeCustomerId, req.StripeCustomerId, req.UserId)
	if err != nil {
		slog.Error("Failed to set stripe customer id", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.Empty{}, nil
}

func (s *StripeServiceServer) GetStripeCustomerId(ctx context.Context, req *pb.GetStripeCustomerIdRequest) (*pb.GetStripeCustomerIdResponse, error) {
	stripeCustomerId := repo.StripeCustomerId{}
	err := s.db.GetContext(ctx, &stripeCustomerId, queries.QueryGetStripeCustomerId, req.UserId)
	if err != nil {
		if err == sql.ErrNoRows {
			return &pb.GetStripeCustomerIdResponse{
				StripeCustomerId: "",
			}, nil
		}

		slog.Error("Failed to get stripe customer id", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.GetStripeCustomerIdResponse{
		StripeCustomerId: *stripeCustomerId.StripeCustomerId,
	}, nil
}

func (s *StripeServiceServer) GetUserId(ctx context.Context, req *pb.GetUserIdRequest) (*pb.GetUserIdResponse, error) {
	userId := repo.UserId{}
	err := s.db.GetContext(ctx, &userId, queries.QueryGetUserId, req.StripeCustomerId)
	if err != nil {
		if err == sql.ErrNoRows {
			return &pb.GetUserIdResponse{
				UserId: "",
			}, nil
		}

		slog.Error("Failed to get user id", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.GetUserIdResponse{
		UserId: *userId.UserId,
	}, nil
}
