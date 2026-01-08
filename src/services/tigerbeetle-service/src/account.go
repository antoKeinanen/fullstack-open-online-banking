package main

import (
	"context"
	"log"

	pb "protobufs/gen/go/tigerbeetle-service"
	"tigerbeetle-service/src/lib"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

func (s *TigerbeetleServiceServer) EnsureSystemFloatAccountExists(ctx context.Context, _ *pb.Empty) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	_, createSpan := tracer.Start(ctx, lib.EVENT_TB_CREATE_ACCOUNT)
	defer createSpan.End()

	createSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_ACCOUNT_ID, "1"),
	)

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
		return nil, lib.ErrUnexpected
	}
	for _, accErr := range accountErrors {
		switch accErr.Result {
		case tbt.AccountExists:
			createSpan.AddEvent(lib.EVENT_TB_ACCOUNT_EXISTS)
			return &pb.Empty{}, nil
		default:
			createSpan.AddEvent("tb.account.error", trace.WithAttributes(
				attribute.String("error", accErr.Result.String()),
			))
			return nil, lib.ErrUnexpected
		}
	}
	createSpan.End()

	return &pb.Empty{}, nil
}

func (s *TigerbeetleServiceServer) LookupAccount(ctx context.Context, accountId *pb.AccountId) (*pb.Account, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_TB_ACCOUNT_ID, accountId.AccountId),
	)

	_, lookupSpan := tracer.Start(ctx, lib.EVENT_TB_LOOKUP_ACCOUNT)
	defer lookupSpan.End()

	accountIdUint128, err := tbt.HexStringToUint128(accountId.AccountId)
	if err != nil {
		lookupSpan.RecordError(err)
		lookupSpan.AddEvent(lib.EVENT_VALIDATION_FAILED)
		return nil, lib.ErrInvalidRequest
	}

	accounts, err := s.tbClient.LookupAccounts([]tbt.Uint128{accountIdUint128})
	if err != nil {
		lookupSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if len(accounts) == 0 {
		lookupSpan.AddEvent(lib.EVENT_TB_ACCOUNT_NOT_FOUND)
		return nil, lib.ErrUnexpected
	}
	lookupSpan.End()

	return ToPbAccount(accounts[0]), nil
}

func (s *TigerbeetleServiceServer) CreateAccount(ctx context.Context, _ *pb.Empty) (*pb.AccountId, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	_, createSpan := tracer.Start(ctx, lib.EVENT_TB_CREATE_ACCOUNT)
	defer createSpan.End()

	accountId := tbt.ID()

	createSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_ACCOUNT_ID, accountId.String()),
	)

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
		createSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if len(accountErrors) != 0 {
		for _, accErr := range accountErrors {
			createSpan.AddEvent("tb.account.error", trace.WithAttributes(
				attribute.String("error", accErr.Result.String()),
			))
		}
		return nil, lib.ErrUnexpected
	}
	createSpan.End()

	return &pb.AccountId{AccountId: accountId.String()}, nil
}
