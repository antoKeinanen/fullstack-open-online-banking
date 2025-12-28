package main

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"time"

	"user-service/src/lib"
	"user-service/src/queries"
	"user-service/src/repo"

	"github.com/lib/pq"

	tbPb "protobufs/gen/go/tigerbeetle-service"
	pb "protobufs/gen/go/user-service"
)

func (s *UserServiceServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
	birthDate, err := time.Parse(time.RFC3339, req.BirthDate)
	if err != nil {
		slog.Error("Failed to create user, birthday parsing failed", "error", err)
		return nil, lib.ErrUnacceptableRequest
	}

	now := time.Now().UTC()
	if birthDate.AddDate(18, 0, 0).After(now) {
		slog.Info("Failed to create user", "error", "user is not over 18")
		return nil, lib.ErrUnacceptableRequest
	}

	tbUser, err := s.tigerbeetleService.CreateAccount(ctx, &tbPb.Empty{})
	if err != nil {
		slog.Error("Failed to create tigerbeetle account", "error", err)
		return nil, lib.ErrUnexpected
	}

	user := repo.User{}
	err = s.db.GetContext(ctx, &user, queries.QueryCreateUser, tbUser.AccountId, req.PhoneNumber, req.FirstName, req.LastName, req.Address, birthDate)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			slog.Error("Failed to create account, user_id unique constraint failed", "error", err)
			return nil, lib.ErrConflict
		}

		slog.Error("Error: Failed to insert user to the database", "error", err)
		return nil, lib.ErrUnexpected
	}

	return repo.DbUserToPbUser(user, "0", "0")
}

func (s *UserServiceServer) GetUserById(ctx context.Context, req *pb.GetUserByIdRequest) (*pb.User, error) {
	user := repo.User{}
	err := s.db.GetContext(ctx, &user, queries.QueryGetUserById, req.UserId)
	if err != nil {
		if err == sql.ErrNoRows {
			slog.Info("User not found", "error", err)
			return nil, lib.ErrNotFound
		}

		slog.Error("Failed to get user from the database", "error", err)
		return nil, lib.ErrUnexpected
	}

	account, err := s.tigerbeetleService.LookupAccount(ctx, &tbPb.AccountId{AccountId: req.UserId})
	if err != nil {
		if err == lib.ErrNotFound {
			slog.Info("Account not found", "error", err)
			return nil, lib.ErrNotFound
		}
		slog.Error("Failed to get account for user", "error", err)
		return nil, lib.ErrUnexpected
	}

	return repo.DbUserToPbUser(user, account.CreditsPosted, account.DebitsPosted)
}

func (s *UserServiceServer) GetUserByPhoneNumber(ctx context.Context, req *pb.GetUserByPhoneNumberRequest) (*pb.User, error) {
	user := repo.User{}
	err := s.db.GetContext(ctx, &user, queries.QueryGetUserByPhoneNumber, req.PhoneNumber)
	if err != nil {
		if err == sql.ErrNoRows {
			slog.Info("User not found", "error", err)
			return nil, lib.ErrNotFound
		}

		slog.Error("Failed to get user from the database", "error", err)
		return nil, lib.ErrUnexpected
	}

	account, err := s.tigerbeetleService.LookupAccount(ctx, &tbPb.AccountId{AccountId: user.UserId})
	if err != nil {
		if err == lib.ErrNotFound {
			slog.Info("Account not found", "error", err)
			return nil, lib.ErrNotFound
		}
		slog.Error("Failed to get account for user", "error", err)
		return nil, lib.ErrUnexpected
	}

	return repo.DbUserToPbUser(user, account.CreditsPosted, account.DebitsPosted)
}

func (s *UserServiceServer) GetUserTransfers(ctx context.Context, req *pb.GetUserTransfersRequest) (*pb.GetUserTransfersResponse, error) {
	tbReq := tbPb.GetAccountTransfersRequest{
		UserId:       req.UserId,
		MinTimestamp: req.MinTimestamp,
		MaxTimestamp: req.MaxTimestamp,
		Limit:        req.Limit,
	}

	transfers, err := s.tigerbeetleService.GetAccountTransfers(ctx, &tbReq)
	if err != nil {
		slog.Error("Failed to get user transactions", "error", err)
		return nil, lib.ErrUnexpected
	}

	userIds := make([]string, len(transfers.Transfers)*2)
	for i, transfer := range transfers.Transfers {
		userIds[i*2] = transfer.DebitAccountId
		userIds[i*2+1] = transfer.CreditAccountId
	}
	userIds = lib.RemoveDuplicates(userIds)

	userIdToName, err := repo.MapUserIdsToUsernames(ctx, s.db, userIds)
	if err != nil {
		return nil, err
	}

	pbTransfers := make([]*pb.Transfer, len(transfers.Transfers))
	for i, transfer := range transfers.Transfers {
		debitUserName := userIdToName[transfer.DebitAccountId]
		creditUserName := userIdToName[transfer.CreditAccountId]

		pbTransfers[i] = repo.TbTransferToPbTransfer(transfer, debitUserName, creditUserName, req.UserId)
	}

	return &pb.GetUserTransfersResponse{
		Transfers: pbTransfers,
	}, nil
}
