package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"time"

	tbPb "protobufs/gen/go/tigerbeetle-service"
	pb "protobufs/gen/go/user-service"
)

func DbUserToPbUser(dbUser User) *pb.User {
	return &pb.User{
		UserId:      dbUser.UserId,
		PhoneNumber: dbUser.PhoneNumber,
		FirstName:   dbUser.FirstName,
		LastName:    dbUser.LastName,
		Address:     dbUser.Address,
		CreatedAt:   dbUser.CreatedAt.Format(time.RFC3339),
	}
}

func (s *UserServiceServer) CreateUser(_ context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
	tbUser, err := s.tigerbeetleService.CreateAccount(context.Background(), &tbPb.Empty{})
	if err != nil {
		log.Printf("Error: failed to create tigerbeetle account: %v", err)
		return nil, errors.New("tigerbeetle_error")
	}

	tx, err := s.db.Beginx()
	if err != nil {
		log.Printf("Error: failed to create database transaction: %v", err)
		return nil, errors.New("database_error")
	}
	defer tx.Rollback()

	user := User{}
	err = tx.Get(&user,
		`INSERT INTO banking.users
		(user_id, phone_number, first_name, last_name, address) 
		VALUES ($1,$2,$3,$4, $5) 
		RETURNING user_id, phone_number, first_name, last_name, address
	`,
		tbUser.AccountId, req.PhoneNumber, req.FirstName, req.LastName, req.Address,
	)
	if err != nil {
		log.Printf("Error: Failed to insert user to the database: %v", err)
		return nil, errors.New("database_insert_failed")
	}

	err = tx.Commit()
	if err != nil {
		log.Printf("Error: Failed to commit new user to the database: %v", err)
		return nil, errors.New("create_failure")
	}

	return DbUserToPbUser(user), nil
}

func (s *UserServiceServer) GetUserById(_ context.Context, req *pb.GetUserByIdRequest) (*pb.User, error) {
	user := User{}
	err := s.db.Get(&user, `
		select user_id, phone_number, first_name, last_name, address, created_at
		from banking.users
		where user_id = $1`,
		req.UserId,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Error: User not found: %v", err)
			return nil, errors.New("user_not_found")
		}

		log.Printf("Error: Failed to get user from the database: %v", err)
		return nil, errors.New("database_error")
	}

	return DbUserToPbUser(user), nil
}

func (s *UserServiceServer) GetUsersPaginated(_ context.Context, req *pb.GetUsersPaginatedRequest) (*pb.GetUsersPaginatedResponse, error) {
	rows, err := s.db.Queryx(`
		select user_id, phone_number, first_name, last_name, address, created_at
		from banking.users
		order by user_id
		offset $1
		limit $2
	`, req.Offset, req.Take)
	if err != nil {
		log.Printf("Error: Failed to get users from the database: %v", err)
		return nil, errors.New("database_error")
	}

	var users []*pb.User
	for rows.Next() {
		user := User{}
		if err := rows.StructScan(&user); err != nil {
			log.Printf("Error: Failed to get users from the database: %v", err)
			return nil, errors.New("database_error")
		}
		users = append(users, DbUserToPbUser(user))
	}

	return &pb.GetUsersPaginatedResponse{
		Users: users,
		Count: 0,
	}, nil
}
