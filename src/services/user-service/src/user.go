package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
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
		log.Println("Error: failed to parse user's birth day", err)
		return nil, lib.ErrUnacceptableRequest
	}

	now := time.Now().UTC()
	if birthDate.AddDate(18, 0, 0).After(now) {
		log.Println("Warning: failed to create user: user is not over 18", birthDate)
		return nil, lib.ErrUnacceptableRequest
	}

	tbUser, err := s.tigerbeetleService.CreateAccount(context.Background(), &tbPb.Empty{})
	if err != nil {
		log.Printf("Error: failed to create tigerbeetle account: %v", err)
		return nil, lib.ErrUnexpected
	}

	user := repo.User{}
	err = s.db.Get(&user, queries.QueryCreateUser, tbUser.AccountId, req.PhoneNumber, req.FirstName, req.LastName, req.Address, birthDate)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			log.Println("Error: Failed to create account, user_id unique constraint failed")
			return nil, lib.ErrConflict
		}

		log.Printf("Error: Failed to insert user to the database: %v", err)
		return nil, lib.ErrUnexpected
	}

	return repo.DbUserToPbUser(user), nil
}

func (s *UserServiceServer) GetUserById(_ context.Context, req *pb.GetUserByIdRequest) (*pb.User, error) {
	user := repo.User{}
	err := s.db.Get(&user, queries.QueryGetUserById, req.UserId)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Error: User not found: %v", err)
			return nil, lib.ErrNotFound
		}

		log.Printf("Error: Failed to get user from the database: %v", err)
		return nil, lib.ErrUnexpected
	}

	return repo.DbUserToPbUser(user), nil
}

func (s *UserServiceServer) GetUsersPaginated(_ context.Context, req *pb.GetUsersPaginatedRequest) (*pb.GetUsersPaginatedResponse, error) {
	rows, err := s.db.Queryx(queries.QueryGetAllUsersPaginated, req.Offset, req.Take)
	if err != nil {
		log.Printf("Error: Failed to get users from the database: %v", err)
		return nil, lib.ErrUnexpected
	}

	var users []*pb.User
	for rows.Next() {
		user := repo.User{}
		if err := rows.StructScan(&user); err != nil {
			log.Printf("Error: Failed to get users from the database: %v", err)
			return nil, lib.ErrUnexpected
		}
		users = append(users, repo.DbUserToPbUser(user))
	}

	return &pb.GetUsersPaginatedResponse{
		Users: users,
		Count: 0,
	}, nil
}
