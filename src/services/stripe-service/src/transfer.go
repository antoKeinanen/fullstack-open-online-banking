package main

import (
	"context"
	"database/sql"
	"log/slog"
	pb "protobufs/gen/go/stripe-service"
	tbPb "protobufs/gen/go/tigerbeetle-service"
	"stripe-service/src/lib"
	"stripe-service/src/queries"
	"stripe-service/src/repo"
)

func (s *StripeServiceServer) GetPendingTransfer(ctx context.Context, req *pb.GetPendingTransferRequest) (*pb.GetPendingTransferResponse, error) {
	transfer := repo.Transfer{}
	err := s.db.GetContext(ctx, &transfer, queries.QueryGetPendingTransfer, req.StripePaymentIntentId)
	if err != nil && err != sql.ErrNoRows {
		slog.Error("Failed to get pending transfer", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.GetPendingTransferResponse{
		TigerbeetleTransferId: transfer.TigerbeetleTransferId,
		UserId:                transfer.UserId,
	}, nil
}

func (s *StripeServiceServer) PostPendingTransfer(ctx context.Context, req *pb.PostPendingTransferRequest) (*pb.Empty, error) {
	_, err := s.tigerbeetleService.PostPendingTransfer(ctx, &tbPb.PostPendingTransferRequest{
		CreditAccountId:   lib.SYSTEM_FLOAT_ACCOUNT_ID,
		DebitAccountId:    req.UserId,
		PendingTransferId: req.TigerbeetleTransferId,
		Amount:            req.Amount,
	})
	if err != nil {
		slog.Error("Failed to post pending transfer", "error", err)
		return nil, lib.ErrUnexpected
	}

	result, err := s.db.ExecContext(ctx, queries.QueryPostPendingTransfer, req.TigerbeetleTransferId)
	if err != nil {
		slog.Error("Failed to post pending transfer", "error", err)
		return nil, lib.ErrUnexpected
	}
	if rows, err := result.RowsAffected(); err != nil || rows == 0 {
		slog.Error("Failed to post pending transfer", "error", "No rows affected")
		return nil, lib.ErrNotFound
	}

	return &pb.Empty{}, nil
}

func (s *StripeServiceServer) VoidPendingTransfer(ctx context.Context, req *pb.VoidPendingTransferRequest) (*pb.Empty, error) {
	_, err := s.tigerbeetleService.VoidPendingTransfer(ctx, &tbPb.VoidPendingTransferRequest{
		CreditAccountId:   lib.SYSTEM_FLOAT_ACCOUNT_ID,
		DebitAccountId:    req.UserId,
		Amount:            req.Amount,
		PendingTransferId: req.TigerbeetleTransferId,
	})
	if err != nil {
		slog.Error("Failed to void pending transfer", "error", err)
		return nil, lib.ErrUnexpected
	}

	result, err := s.db.ExecContext(ctx, queries.QueryVoidPendingTransfer, req.TigerbeetleTransferId)
	if err != nil {
		slog.Error("Failed to void pending transfer", "error", err)
		return nil, lib.ErrUnexpected
	}
	if rows, err := result.RowsAffected(); err != nil || rows == 0 {
		slog.Error("Failed to void pending transfer", "error", "No rows affected")
		return nil, lib.ErrNotFound
	}

	return &pb.Empty{}, nil
}

func (s *StripeServiceServer) CreateAndPostTransfer(ctx context.Context, req *pb.CreateAndPostTransferRequest) (*pb.Empty, error) {
	transfer, err := s.tigerbeetleService.CreateTransfer(ctx, &tbPb.CreateTransferRequest{
		CreditAccountId: lib.SYSTEM_FLOAT_ACCOUNT_ID,
		DebitAccountId:  req.UserId,
		Amount:          req.Amount,
	})
	if err != nil {
		slog.Error("Failed to create and post transfer", "err", err)
		return nil, lib.ErrUnexpected
	}

	_, err = s.db.ExecContext(ctx, queries.QueryCreateAndPostTransfer, req.StripePaymentIntentId, transfer.TransferId, req.StripeCustomerId, req.UserId)
	if err != nil {
		slog.Error("Failed to create and post transfer", "err", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.Empty{}, nil
}

func (s *StripeServiceServer) CreatePendingTransfer(ctx context.Context, req *pb.CreatePendingTransferRequest) (*pb.Empty, error) {
	transfer, err := s.tigerbeetleService.CreatePendingTransfer(ctx, &tbPb.CreatePendingRequest{
		CreditAccountId: lib.SYSTEM_FLOAT_ACCOUNT_ID,
		DebitAccountId:  req.UserId,
		Amount:          req.Amount,
	})
	if err != nil {
		slog.Error("Failed to create pending transfer", "error", err)
		return nil, lib.ErrUnexpected
	}

	_, err = s.db.ExecContext(ctx, queries.QueryCreatePendingTransfer, req.StripePaymentIntentId, transfer.TransferId, req.StripeCustomerId, req.UserId)
	if err != nil {
		slog.Error("Failed to create pending transfer", "error", err)
		return nil, lib.ErrUnexpected
	}

	return &pb.Empty{}, nil
}
