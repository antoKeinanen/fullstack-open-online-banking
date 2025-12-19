package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	pb "protobufs/gen/go/tigerbeetle-service"

	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

func (s *TigerbeetleServiceServer) CreateTransfer(ctx context.Context, req *pb.CreateTransferRequest) (*pb.TransferId, error) {
	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		slog.Warn("Failed to create a single stage transfer", "error", err)
		return nil, errors.New("invalid_request")
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		log.Printf("Failed to create pending transfer: creditAccountId parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		log.Printf("Failed to create pending transfer: amount parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}

	transfer := tbt.Transfer{
		ID:              tbt.ID(),
		DebitAccountID:  debitAccountIdUint128,
		CreditAccountID: creditAccountIdUint128,
		Amount:          amountUint128,
		Ledger:          1,
		Code:            1,
	}

	transferErrors, err := s.tbClient.CreateTransfers([]tbt.Transfer{transfer})
	if err != nil {
		log.Printf("Failed to create transfer: %v", err)
		return nil, errors.New("creation_failed")
	}
	for _, err := range transferErrors {
		switch err.Result {
		case tbt.TransferExceedsDebits:
			return nil, errors.New("not_enough_funds")
		default:
			log.Printf("Failed to create transaction %v", err)
			return nil, errors.New("creation_failed")
		}
	}

	return &pb.TransferId{
		TransferId: transfer.ID.String(),
	}, nil
}

func (s *TigerbeetleServiceServer) CreatePendingTransfer(_ context.Context, req *pb.CreatePendingRequest) (*pb.TransferId, error) {
	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		log.Printf("Failed to create pending transfer: debitAccountId parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		log.Printf("Failed to create pending transfer: creditAccountId parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		log.Printf("Failed to create pending transfer: amount parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}

	transferFlags := tbt.TransferFlags{
		Pending: true,
	}

	transfer := tbt.Transfer{
		ID:              tbt.ID(),
		DebitAccountID:  debitAccountIdUint128,
		CreditAccountID: creditAccountIdUint128,
		Amount:          amountUint128,
		Ledger:          1,
		Code:            1,
		Flags:           transferFlags.ToUint16(),
	}

	transferErrors, err := s.tbClient.CreateTransfers([]tbt.Transfer{transfer})
	if err != nil {
		log.Printf("Failed to create transfer: %v", err)
		return nil, errors.New("creation_failed")
	}
	if len(transferErrors) != 0 {
		for _, err := range transferErrors {
			log.Printf("Failed to create transfer: %v", err)
		}
		return nil, errors.New("creation_failed")
	}

	return &pb.TransferId{
		TransferId: transfer.ID.String(),
	}, nil
}

func (s *TigerbeetleServiceServer) PostPendingTransfer(_ context.Context, req *pb.PostPendingTransferRequest) (*pb.TransferId, error) {
	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		log.Printf("Failed to post pending transfer: debitAccountId parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		log.Printf("Failed to post pending transfer: creditAccountId parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		log.Printf("Failed to post pending transfer: amount parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}
	pendingTransferIdUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		log.Printf("Failed to post pending transfer: pending transfer id parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}

	transferFlags := tbt.TransferFlags{
		PostPendingTransfer: true,
	}

	transfer := tbt.Transfer{
		ID:              tbt.ID(),
		DebitAccountID:  debitAccountIdUint128,
		CreditAccountID: creditAccountIdUint128,
		Amount:          amountUint128,
		PendingID:       pendingTransferIdUint128,
		Flags:           transferFlags.ToUint16(),
	}

	transferErrors, err := s.tbClient.CreateTransfers([]tbt.Transfer{transfer})
	if err != nil {
		log.Printf("Failed to post transfer: %v", err)
		return nil, errors.New("creation_failed")
	}
	if len(transferErrors) != 0 {
		for _, err := range transferErrors {
			log.Printf("Failed to post transfer: %v", err)
		}
		return nil, errors.New("creation_failed")
	}

	return &pb.TransferId{
		TransferId: transfer.ID.String(),
	}, nil
}

func (s *TigerbeetleServiceServer) VoidPendingTransfer(_ context.Context, req *pb.VoidPendingTransferRequest) (*pb.TransferId, error) {
	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		log.Printf("Failed to void pending transfer: debitAccountId parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		log.Printf("Failed to void pending transfer: creditAccountId parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		log.Printf("Failed to void pending transfer: amount parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}
	pendingTransferIdUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		log.Printf("Failed to void pending transfer: pending transfer id parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}

	transferFlags := tbt.TransferFlags{
		VoidPendingTransfer: true,
	}

	transfer := tbt.Transfer{
		ID:              tbt.ID(),
		DebitAccountID:  debitAccountIdUint128,
		CreditAccountID: creditAccountIdUint128,
		Amount:          amountUint128,
		PendingID:       pendingTransferIdUint128,
		Flags:           transferFlags.ToUint16(),
	}

	transferErrors, err := s.tbClient.CreateTransfers([]tbt.Transfer{transfer})
	if err != nil {
		log.Printf("Failed to void transfer: %v", err)
		return nil, errors.New("creation_failed")
	}
	if len(transferErrors) != 0 {
		for _, err := range transferErrors {
			log.Printf("Failed to void transfer: %v", err)
		}
		return nil, errors.New("creation_failed")
	}

	return &pb.TransferId{
		TransferId: transfer.ID.String(),
	}, nil
}

func (s *TigerbeetleServiceServer) LookupTransfer(_ context.Context, req *pb.TransferId) (*pb.Transfer, error) {
	transferIdUint128, err := tbt.HexStringToUint128(req.TransferId)
	if err != nil {
		log.Printf("Failed to void pending transfer: debitAccountId parsing failed %v", err)
		return nil, errors.New("invalid_request")
	}

	transfers, err := s.tbClient.LookupTransfers([]tbt.Uint128{transferIdUint128})
	if err != nil {
		log.Printf("Failed to lookup transfer with id %v: %v", transferIdUint128, err)
		return nil, errors.New("not_found")
	}
	if len(transfers) == 0 {
		log.Printf("Did not find any transfers matching id %v", transferIdUint128)
		return nil, errors.New("not_found")
	}

	return ToPbTransfer(transfers[0]), nil
}
