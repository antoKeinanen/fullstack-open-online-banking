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

func (s *UserServiceServer) CreateUser(_ context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
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

	tbUser, err := s.tigerbeetleService.CreateAccount(context.Background(), &tbPb.Empty{})
	if err != nil {
		slog.Error("Failed to create tigerbeetle account", "error", err)
		return nil, lib.ErrUnexpected
	}

	user := repo.User{}
	err = s.db.Get(&user, queries.QueryCreateUser, tbUser.AccountId, req.PhoneNumber, req.FirstName, req.LastName, req.Address, birthDate)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			slog.Error("Failed to create account, user_id unique constraint failed", "error", err)
			return nil, lib.ErrConflict
		}

		slog.Error("Error: Failed to insert user to the database", "error", err)
		return nil, lib.ErrUnexpected
	}

	return repo.DbUserToPbUser(user), nil
}

func (s *UserServiceServer) GetUserById(_ context.Context, req *pb.GetUserByIdRequest) (*pb.User, error) {
	user := repo.User{}
	err := s.db.Get(&user, queries.QueryGetUserById, req.UserId)
	if err != nil {
		if err == sql.ErrNoRows {
			slog.Info("User not found", "error", err)
			return nil, lib.ErrNotFound
		}

		slog.Error("Failed to get user from the database", "error", err)
		return nil, lib.ErrUnexpected
	}

	return repo.DbUserToPbUser(user), nil
}

func (s *UserServiceServer) GetUsersPaginated(_ context.Context, req *pb.GetUsersPaginatedRequest) (*pb.GetUsersPaginatedResponse, error) {
	rows, err := s.db.Queryx(queries.QueryGetAllUsersPaginated, req.Offset, req.Take)
	if err != nil {
		slog.Error("Failed to get users from the database", "error", err)
		return nil, lib.ErrUnexpected
	}

	var users []*pb.User
	for rows.Next() {
		user := repo.User{}
		if err := rows.StructScan(&user); err != nil {
			slog.Error("Failed to get users from the database", "error", err)
			return nil, lib.ErrUnexpected
		}
		users = append(users, repo.DbUserToPbUser(user))
	}

	return &pb.GetUsersPaginatedResponse{
		Users: users,
		Count: 0,
	}, nil
}
