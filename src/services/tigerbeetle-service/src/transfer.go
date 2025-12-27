package main

import (
	"context"
	"errors"
	"log/slog"
	pb "protobufs/gen/go/tigerbeetle-service"
	"time"

	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

func (s *TigerbeetleServiceServer) CreateTransfer(ctx context.Context, req *pb.CreateTransferRequest) (*pb.TransferId, error) {
	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		slog.Warn("Failed to create a single stage transfer", "error", err)
		return nil, ErrInvalidRequest
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		slog.Warn("Failed to create a single stage transfer", "error", err, "field", "creditAccountId")
		return nil, ErrInvalidRequest
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		slog.Warn("Failed to create a single stage transfer", "error", err, "field", "amount")
		return nil, ErrInvalidRequest
	}
	slog.Info("CreateTransfer request",
		"debitAccountId", req.DebitAccountId,
		"creditAccountId", req.CreditAccountId,
		"amount", req.Amount)

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
		slog.Error("Failed to create transfer", "error", err)
		return nil, ErrUnexpected
	}
	for _, err := range transferErrors {
		switch err.Result {
		case tbt.TransferExceedsDebits:
			return nil, ErrNotEnoughFunds
		default:
			slog.Error("Failed to create transaction", "error", err)
			return nil, ErrUnexpected
		}
	}

	return &pb.TransferId{
		TransferId: transfer.ID.String(),
	}, nil
}

func (s *TigerbeetleServiceServer) CreatePendingTransfer(_ context.Context, req *pb.CreatePendingRequest) (*pb.TransferId, error) {
	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		slog.Warn("Failed to create pending transfer", "error", err, "field", "debitAccountId")
		return nil, errors.New("invalid_request")
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		slog.Warn("Failed to create pending transfer", "error", err, "field", "creditAccountId")
		return nil, errors.New("invalid_request")
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		slog.Warn("Failed to create pending transfer", "error", err, "field", "amount")
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
		slog.Error("Failed to create pending transfer", "error", err)
		return nil, errors.New("creation_failed")
	}
	if len(transferErrors) != 0 {
		for _, err := range transferErrors {
			slog.Error("Failed to create pending transfer", "error", err)
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
		slog.Warn("Failed to post pending transfer", "error", err, "field", "debitAccountId")
		return nil, errors.New("invalid_request")
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		slog.Warn("Failed to post pending transfer", "error", err, "field", "creditAccountId")
		return nil, errors.New("invalid_request")
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		slog.Warn("Failed to post pending transfer", "error", err, "field", "amount")
		return nil, errors.New("invalid_request")
	}
	pendingTransferIdUint128, err := tbt.HexStringToUint128(req.PendingTransferId)
	if err != nil {
		slog.Warn("Failed to post pending transfer", "error", err, "field", "pendingTransferId")
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
		slog.Error("Failed to post pending transfer", "error", err)
		return nil, errors.New("creation_failed")
	}
	if len(transferErrors) != 0 {
		for _, err := range transferErrors {
			slog.Error("Failed to post pending transfer", "error", err)
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
		slog.Warn("Failed to void pending transfer", "error", err, "field", "debitAccountId")
		return nil, errors.New("invalid_request")
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		slog.Warn("Failed to void pending transfer", "error", err, "field", "creditAccountId")
		return nil, errors.New("invalid_request")
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		slog.Warn("Failed to void pending transfer", "error", err, "field", "amount")
		return nil, errors.New("invalid_request")
	}
	pendingTransferIdUint128, err := tbt.HexStringToUint128(req.PendingTransferId)
	if err != nil {
		slog.Warn("Failed to void pending transfer", "error", err, "field", "pendingTransferId")
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
		slog.Error("Failed to void pending transfer", "error", err)
		return nil, errors.New("creation_failed")
	}
	if len(transferErrors) != 0 {
		for _, err := range transferErrors {
			slog.Error("Failed to void pending transfer", "error", err)
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
		slog.Warn("Failed to lookup transfer", "error", err, "field", "transferId")
		return nil, errors.New("invalid_request")
	}

	transfers, err := s.tbClient.LookupTransfers([]tbt.Uint128{transferIdUint128})
	if err != nil {
		slog.Error("Failed to lookup transfer", "error", err, "transferId", transferIdUint128.String())
		return nil, errors.New("not_found")
	}
	if len(transfers) == 0 {
		slog.Warn("Transfer not found", "transferId", transferIdUint128.String())
		return nil, errors.New("not_found")
	}

	return ToPbTransfer(transfers[0]), nil
}

func TbTransferToPbTransfer(transfer tbt.Transfer) *pb.Transfer {
	return &pb.Transfer{
		TransferId:      transfer.ID.String(),
		Amount:          transfer.Amount.String(),
		DebitAccountId:  transfer.DebitAccountID.String(),
		CreditAccountId: transfer.CreditAccountID.String(),
	}
}

func (s *TigerbeetleServiceServer) GetAccountTransfers(_ context.Context, req *pb.GetAccountTransfersRequest) (*pb.GetAccountTransfersResponse, error) {
	accountIdUint128, err := tbt.HexStringToUint128(req.UserId)
	if err != nil {
		slog.Error("Failed to get account transfers, invalid accountId", "error", err)
		return nil, ErrInvalidRequest
	}
	if req.MaxTimestamp == nil {
		now := uint64(time.Now().UnixNano())
		req.MaxTimestamp = &now
	}
	if req.MinTimestamp == nil {
		minTime := uint64(0)
		req.MinTimestamp = &minTime
	}

	filter := tbt.AccountFilter{
		AccountID:    accountIdUint128,
		TimestampMin: *req.MinTimestamp,
		TimestampMax: *req.MaxTimestamp,
		Limit:        *req.Limit,
		Flags: tbt.AccountFilterFlags{
			Debits:  true,
			Credits: true,
		}.ToUint32(),
	}

	transfers, err := s.tbClient.GetAccountTransfers(filter)
	if err != nil {
		slog.Error("Failed to get account transfers", "error", err)
		return nil, ErrUnexpected
	}

	pbTransfers := make([]*pb.Transfer, len(transfers))
	for i, transfer := range transfers {
		pbTransfers[i] = TbTransferToPbTransfer(transfer)
	}

	return &pb.GetAccountTransfersResponse{
		Transfers: pbTransfers,
	}, nil
}
