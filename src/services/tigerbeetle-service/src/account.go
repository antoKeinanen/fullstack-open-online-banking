package main

import (
	"context"
	"errors"
	"log"

	pb "protobufs/gen/go/tigerbeetle-service"

	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

func (s *TigerbeetleServiceServer) EnsureSystemFloatAccountExists(_ context.Context, _ *pb.Empty) (*pb.Empty, error) {
	account := tbt.Account{
		ID:          tbt.Uint128{1},
		UserData128: tbt.ToUint128(0),
		UserData64:  0,
		UserData32:  0,
		Ledger:      1,
		Code:        718,
		Flags:       0,
		Timestamp:   0,
	}

	accountErrors, err := s.tbClient.CreateAccounts([]tbt.Account{account})
	if err != nil {
		log.Printf("Failed to create account: %v", err)
		return nil, errors.New("creation_failed")
	}
	for _, err := range accountErrors {
		switch err.Result {
		case tbt.AccountExists:
			return &pb.Empty{}, nil
		default:
			log.Printf("Failed to ensure that system float account exists: %v", err)
			return nil, errors.New("creation_failed")

		}
	}

	return &pb.Empty{}, nil
}

func (s *TigerbeetleServiceServer) LookupAccount(_ context.Context, accountId *pb.AccountId) (*pb.Account, error) {
	accountIdUint128, err := tbt.HexStringToUint128(accountId.AccountId)
	if err != nil {
		log.Printf("Failed to lookup account: %v", err)
		return nil, errors.New("invalid_request")
	}

	accounts, err := s.tbClient.LookupAccounts([]tbt.Uint128{accountIdUint128})
	if err != nil {
		log.Printf("Failed to lookup account: %v", err)
		return nil, errors.New("not_found")
	}
	if len(accounts) == 0 {
		log.Println("Failed to lookup account: not found")
		return nil, errors.New("not_found")
	}

	return ToPbAccount(accounts[0]), nil
}

func (s *TigerbeetleServiceServer) CreateAccount(_ context.Context, _ *pb.Empty) (*pb.AccountId, error) {
	accountId := tbt.ID()

	account := tbt.Account{
		ID:          accountId,
		UserData128: tbt.ToUint128(0),
		UserData64:  0,
		UserData32:  0,
		Ledger:      1,
		Code:        718,
		Flags: tbt.AccountFlags{
			CreditsMustNotExceedDebits: true,
		}.ToUint16(),
		Timestamp: 0,
	}

	accountErrors, err := s.tbClient.CreateAccounts([]tbt.Account{account})
	if err != nil {
		log.Printf("Failed to create account: %v", err)
		return nil, errors.New("creation_failed")
	}
	if len(accountErrors) != 0 {
		for _, err := range accountErrors {
			log.Printf("Failed to create account: %v", err)
		}
		return nil, errors.New("creation_failed")
	}

	log.Println("Created account with id", accountId.String())

	return &pb.AccountId{AccountId: accountId.String()}, nil
}
