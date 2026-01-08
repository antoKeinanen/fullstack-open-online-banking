package main

import (
	"context"
	pb "protobufs/gen/go/tigerbeetle-service"
	"tigerbeetle-service/src/lib"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

func (s *TigerbeetleServiceServer) CreateTransfer(ctx context.Context, req *pb.CreateTransferRequest) (*pb.TransferId, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_TB_DEBIT_ACCOUNT_ID, req.DebitAccountId),
		attribute.String(lib.ATTR_TB_CREDIT_ACCOUNT_ID, req.CreditAccountId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	_, createSpan := tracer.Start(ctx, lib.EVENT_TB_CREATE_TRANSFER)
	defer createSpan.End()

	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		createSpan.RecordError(err)
		createSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "debitAccountId"),
		))
		return nil, lib.ErrInvalidRequest
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		createSpan.RecordError(err)
		createSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "creditAccountId"),
		))
		return nil, lib.ErrInvalidRequest
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		createSpan.RecordError(err)
		createSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "amount"),
		))
		return nil, lib.ErrInvalidRequest
	}

	transfer := tbt.Transfer{
		ID:              tbt.ID(),
		DebitAccountID:  debitAccountIdUint128,
		CreditAccountID: creditAccountIdUint128,
		Amount:          amountUint128,
		Ledger:          1,
		Code:            1,
	}

	createSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, transfer.ID.String()),
	)

	transferErrors, err := s.tbClient.CreateTransfers([]tbt.Transfer{transfer})
	if err != nil {
		createSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	for _, transferErr := range transferErrors {
		switch transferErr.Result {
		case tbt.TransferExceedsDebits:
			createSpan.AddEvent(lib.EVENT_TB_NOT_ENOUGH_FUNDS)
			return nil, lib.ErrNotEnoughFunds
		default:
			createSpan.AddEvent("tb.transfer.error", trace.WithAttributes(
				attribute.String("error", transferErr.Result.String()),
			))
			return nil, lib.ErrUnexpected
		}
	}
	createSpan.End()

	return &pb.TransferId{
		TransferId: transfer.ID.String(),
	}, nil
}

func (s *TigerbeetleServiceServer) CreatePendingTransfer(ctx context.Context, req *pb.CreatePendingRequest) (*pb.TransferId, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_TB_DEBIT_ACCOUNT_ID, req.DebitAccountId),
		attribute.String(lib.ATTR_TB_CREDIT_ACCOUNT_ID, req.CreditAccountId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	_, createSpan := tracer.Start(ctx, lib.EVENT_TB_CREATE_PENDING_TRANSFER)
	defer createSpan.End()

	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		createSpan.RecordError(err)
		createSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "debitAccountId"),
		))
		return nil, lib.ErrInvalidRequest
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		createSpan.RecordError(err)
		createSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "creditAccountId"),
		))
		return nil, lib.ErrInvalidRequest
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		createSpan.RecordError(err)
		createSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "amount"),
		))
		return nil, lib.ErrInvalidRequest
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

	createSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, transfer.ID.String()),
	)

	transferErrors, err := s.tbClient.CreateTransfers([]tbt.Transfer{transfer})
	if err != nil {
		createSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if len(transferErrors) != 0 {
		for _, transferErr := range transferErrors {
			createSpan.AddEvent("tb.transfer.error", trace.WithAttributes(
				attribute.String("error", transferErr.Result.String()),
			))
		}
		return nil, lib.ErrUnexpected
	}
	createSpan.End()

	return &pb.TransferId{
		TransferId: transfer.ID.String(),
	}, nil
}

func (s *TigerbeetleServiceServer) PostPendingTransfer(ctx context.Context, req *pb.PostPendingTransferRequest) (*pb.TransferId, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_TB_DEBIT_ACCOUNT_ID, req.DebitAccountId),
		attribute.String(lib.ATTR_TB_CREDIT_ACCOUNT_ID, req.CreditAccountId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
		attribute.String(lib.ATTR_TB_PENDING_TRANSFER_ID, req.PendingTransferId),
	)

	_, postSpan := tracer.Start(ctx, lib.EVENT_TB_POST_PENDING_TRANSFER)
	defer postSpan.End()

	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		postSpan.RecordError(err)
		postSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "debitAccountId"),
		))
		return nil, lib.ErrInvalidRequest
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		postSpan.RecordError(err)
		postSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "creditAccountId"),
		))
		return nil, lib.ErrInvalidRequest
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		postSpan.RecordError(err)
		postSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "amount"),
		))
		return nil, lib.ErrInvalidRequest
	}
	pendingTransferIdUint128, err := tbt.HexStringToUint128(req.PendingTransferId)
	if err != nil {
		postSpan.RecordError(err)
		postSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "pendingTransferId"),
		))
		return nil, lib.ErrInvalidRequest
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

	postSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, transfer.ID.String()),
	)

	transferErrors, err := s.tbClient.CreateTransfers([]tbt.Transfer{transfer})
	if err != nil {
		postSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if len(transferErrors) != 0 {
		for _, transferErr := range transferErrors {
			postSpan.AddEvent("tb.transfer.error", trace.WithAttributes(
				attribute.String("error", transferErr.Result.String()),
			))
		}
		return nil, lib.ErrUnexpected
	}
	postSpan.End()

	return &pb.TransferId{
		TransferId: transfer.ID.String(),
	}, nil
}

func (s *TigerbeetleServiceServer) VoidPendingTransfer(ctx context.Context, req *pb.VoidPendingTransferRequest) (*pb.TransferId, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_TB_DEBIT_ACCOUNT_ID, req.DebitAccountId),
		attribute.String(lib.ATTR_TB_CREDIT_ACCOUNT_ID, req.CreditAccountId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
		attribute.String(lib.ATTR_TB_PENDING_TRANSFER_ID, req.PendingTransferId),
	)

	_, voidSpan := tracer.Start(ctx, lib.EVENT_TB_VOID_PENDING_TRANSFER)
	defer voidSpan.End()

	debitAccountIdUint128, err := tbt.HexStringToUint128(req.DebitAccountId)
	if err != nil {
		voidSpan.RecordError(err)
		voidSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "debitAccountId"),
		))
		return nil, lib.ErrInvalidRequest
	}
	creditAccountIdUint128, err := tbt.HexStringToUint128(req.CreditAccountId)
	if err != nil {
		voidSpan.RecordError(err)
		voidSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "creditAccountId"),
		))
		return nil, lib.ErrInvalidRequest
	}
	amountUint128, err := tbt.HexStringToUint128(req.Amount)
	if err != nil {
		voidSpan.RecordError(err)
		voidSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "amount"),
		))
		return nil, lib.ErrInvalidRequest
	}
	pendingTransferIdUint128, err := tbt.HexStringToUint128(req.PendingTransferId)
	if err != nil {
		voidSpan.RecordError(err)
		voidSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "pendingTransferId"),
		))
		return nil, lib.ErrInvalidRequest
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

	voidSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, transfer.ID.String()),
	)

	transferErrors, err := s.tbClient.CreateTransfers([]tbt.Transfer{transfer})
	if err != nil {
		voidSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if len(transferErrors) != 0 {
		for _, transferErr := range transferErrors {
			voidSpan.AddEvent("tb.transfer.error", trace.WithAttributes(
				attribute.String("error", transferErr.Result.String()),
			))
		}
		return nil, lib.ErrUnexpected
	}
	voidSpan.End()

	return &pb.TransferId{
		TransferId: transfer.ID.String(),
	}, nil
}

func (s *TigerbeetleServiceServer) LookupTransfer(ctx context.Context, req *pb.TransferId) (*pb.Transfer, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, req.TransferId),
	)

	_, lookupSpan := tracer.Start(ctx, lib.EVENT_TB_LOOKUP_TRANSFER)
	defer lookupSpan.End()

	transferIdUint128, err := tbt.HexStringToUint128(req.TransferId)
	if err != nil {
		lookupSpan.RecordError(err)
		lookupSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "transferId"),
		))
		return nil, lib.ErrInvalidRequest
	}

	transfers, err := s.tbClient.LookupTransfers([]tbt.Uint128{transferIdUint128})
	if err != nil {
		lookupSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if len(transfers) == 0 {
		lookupSpan.AddEvent(lib.EVENT_TB_TRANSFER_NOT_FOUND)
		return nil, lib.ErrUnexpected
	}
	lookupSpan.End()

	return ToPbTransfer(transfers[0]), nil
}

func TbTransferToPbTransfer(transfer tbt.Transfer) *pb.Transfer {
	timestampSeconds := int64(transfer.Timestamp / uint64(time.Second.Nanoseconds()))
	timestampNanoSeconds := int64(transfer.Timestamp % uint64(time.Second.Nanoseconds()))

	flags := transfer.TransferFlags()

	return &pb.Transfer{
		TransferId:      transfer.ID.String(),
		Amount:          transfer.Amount.String(),
		DebitAccountId:  transfer.DebitAccountID.String(),
		CreditAccountId: transfer.CreditAccountID.String(),
		Timestamp:       time.Unix(timestampSeconds, timestampNanoSeconds).UTC().Format(time.RFC3339Nano),
		Pending:         flags.Pending,
		Posted:          flags.PostPendingTransfer,
		Voided:          flags.VoidPendingTransfer,
	}
}

func (s *TigerbeetleServiceServer) GetAccountTransfers(ctx context.Context, req *pb.GetAccountTransfersRequest) (*pb.GetAccountTransfersResponse, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_TB_ACCOUNT_ID, req.UserId),
	)

	_, getSpan := tracer.Start(ctx, lib.EVENT_TB_GET_TRANSFERS)
	defer getSpan.End()

	accountIdUint128, err := tbt.HexStringToUint128(req.UserId)
	if err != nil {
		getSpan.RecordError(err)
		getSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "accountId"),
		))
		return nil, lib.ErrInvalidRequest
	}

	if req.MaxTimestamp == nil {
		now := time.Now().UTC().Format(time.RFC3339Nano)
		req.MaxTimestamp = &now
	}
	if req.MinTimestamp == nil {
		minTime := time.Unix(0, 0).UTC().Format(time.RFC3339Nano)
		req.MinTimestamp = &minTime
	}

	getSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_FILTER_MIN_TIMESTAMP, *req.MinTimestamp),
		attribute.String(lib.ATTR_TB_FILTER_MAX_TIMESTAMP, *req.MaxTimestamp),
		attribute.Int64(lib.ATTR_TB_FILTER_LIMIT, int64(*req.Limit)),
	)

	minTimestamp, err := time.Parse(time.RFC3339Nano, *req.MinTimestamp)
	if err != nil {
		getSpan.RecordError(err)
		getSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "minTimestamp"),
		))
		return nil, lib.ErrInvalidRequest
	}
	maxTimestamp, err := time.Parse(time.RFC3339Nano, *req.MaxTimestamp)
	if err != nil {
		getSpan.RecordError(err)
		getSpan.AddEvent(lib.EVENT_VALIDATION_FAILED, trace.WithAttributes(
			attribute.String("field", "maxTimestamp"),
		))
		return nil, lib.ErrInvalidRequest
	}

	filter := tbt.AccountFilter{
		AccountID:    accountIdUint128,
		TimestampMin: uint64(minTimestamp.UnixNano()),
		TimestampMax: uint64(maxTimestamp.UnixNano()),
		Limit:        *req.Limit,
		Flags: tbt.AccountFilterFlags{
			Debits:   true,
			Credits:  true,
			Reversed: true,
		}.ToUint32(),
	}

	transfers, err := s.tbClient.GetAccountTransfers(filter)
	if err != nil {
		getSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	getSpan.SetAttributes(
		attribute.Int(lib.ATTR_TB_TRANSFER_COUNT, len(transfers)),
	)

	pbTransfers := make([]*pb.Transfer, len(transfers))
	for i, transfer := range transfers {
		pbTransfers[i] = TbTransferToPbTransfer(transfer)
	}
	getSpan.End()

	return &pb.GetAccountTransfersResponse{
		Transfers: pbTransfers,
	}, nil
}
