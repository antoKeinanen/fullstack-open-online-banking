package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"time"

	"github.com/lib/pq"

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
		BirthDate:   dbUser.BirthDate.UTC().Format(time.RFC3339),
		CreatedAt:   dbUser.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func (s *UserServiceServer) CreateUser(_ context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
	tbUser, err := s.tigerbeetleService.CreateAccount(context.Background(), &tbPb.Empty{})
	if err != nil {
		log.Printf("Error: failed to create tigerbeetle account: %v", err)
		return nil, errors.New("tigerbeetle_error")
	}

	birthDate, err := time.Parse(time.RFC3339, req.BirthDate)
	if err != nil {
		log.Println("Error: failed to parse user's birth day", err)
		return nil, errors.New("invalid_age")
	}

	now := time.Now().UTC()
	if birthDate.AddDate(18, 0, 0).After(now) {
		log.Println("Warning: failed to create user: user is not over 18", birthDate)
		return nil, errors.New("user_underage")
	}

	user := User{}
	err = s.db.Get(&user,
		`INSERT INTO banking.users
		(user_id, phone_number, first_name, last_name, address, birth_date) 
		VALUES ($1,$2,$3,$4,$5,$6) 
		RETURNING user_id, phone_number, first_name, last_name, address, created_at, birth_date
	`,
		tbUser.AccountId, req.PhoneNumber, req.FirstName, req.LastName, req.Address, birthDate,
	)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, errors.New("user_already_exists")
		}

		log.Printf("Error: Failed to insert user to the database: %v", err)
		return nil, errors.New("database_insert_failed")
	}

	return DbUserToPbUser(user), nil
}

func (s *UserServiceServer) GetUserById(_ context.Context, req *pb.GetUserByIdRequest) (*pb.User, error) {
	user := User{}
	err := s.db.Get(&user, `
		select user_id, phone_number, first_name, last_name, address, created_at, birth_date
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
		select user_id, phone_number, first_name, last_name, address, created_at, birth_date
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
