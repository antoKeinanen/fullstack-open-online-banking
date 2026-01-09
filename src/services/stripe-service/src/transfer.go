package main

import (
	"context"
	"database/sql"
	pb "protobufs/gen/go/stripe-service"
	tbPb "protobufs/gen/go/tigerbeetle-service"
	"stripe-service/src/lib"
	"stripe-service/src/queries"
	"stripe-service/src/repo"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

func (s *StripeServiceServer) GetPendingTransfer(ctx context.Context, req *pb.GetPendingTransferRequest) (*pb.GetPendingTransferResponse, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_STRIPE_PAYMENT_INTENT_ID, req.StripePaymentIntentId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_TRANSFER_GET_PENDING)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryGetPendingTransfer),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripePaymentIntentId}),
	)

	transfer := repo.Transfer{}
	err := s.db.GetContext(ctx, &transfer, queries.QueryGetPendingTransfer, req.StripePaymentIntentId)
	if err != nil && err != sql.ErrNoRows {
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	if err == sql.ErrNoRows {
		dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS)
	} else {
		dbSpan.SetAttributes(
			attribute.String(lib.ATTR_TB_TRANSFER_ID, transfer.TigerbeetleTransferId),
			attribute.String(lib.ATTR_USER_ID, transfer.UserId),
		)
	}
	dbSpan.End()

	return &pb.GetPendingTransferResponse{
		TigerbeetleTransferId: transfer.TigerbeetleTransferId,
		UserId:                transfer.UserId,
	}, nil
}

func (s *StripeServiceServer) PostPendingTransfer(ctx context.Context, req *pb.PostPendingTransferRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_TB_TRANSFER_ID, req.TigerbeetleTransferId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	ctx, tbSpan := tracer.Start(ctx, lib.EVENT_TB_POST_PENDING_TRANSFER)
	defer tbSpan.End()

	tbSpan.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_TB_TRANSFER_ID, req.TigerbeetleTransferId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	tbSpan.AddEvent(lib.EVENT_TB_POST_PENDING_TRANSFER)

	_, err := s.tigerbeetleService.PostPendingTransfer(ctx, &tbPb.PostPendingTransferRequest{
		CreditAccountId:   lib.SYSTEM_FLOAT_ACCOUNT_ID,
		DebitAccountId:    req.UserId,
		PendingTransferId: req.TigerbeetleTransferId,
		Amount:            req.Amount,
	})
	if err != nil {
		tbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	tbSpan.End()

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_DB_QUERY)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryPostPendingTransfer),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.TigerbeetleTransferId}),
	)

	result, err := s.db.ExecContext(ctx, queries.QueryPostPendingTransfer, req.TigerbeetleTransferId)
	if err != nil {
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	rows, err := result.RowsAffected()
	if err != nil || rows == 0 {
		dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS_AFFECTED)
		return nil, lib.ErrNotFound
	}

	dbSpan.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rows),
	)
	dbSpan.End()

	return &pb.Empty{}, nil
}

func (s *StripeServiceServer) VoidPendingTransfer(ctx context.Context, req *pb.VoidPendingTransferRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_TB_TRANSFER_ID, req.TigerbeetleTransferId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	ctx, tbSpan := tracer.Start(ctx, lib.EVENT_TB_VOID_PENDING_TRANSFER)
	defer tbSpan.End()

	_, err := s.tigerbeetleService.VoidPendingTransfer(ctx, &tbPb.VoidPendingTransferRequest{
		CreditAccountId:   lib.SYSTEM_FLOAT_ACCOUNT_ID,
		DebitAccountId:    req.UserId,
		Amount:            req.Amount,
		PendingTransferId: req.TigerbeetleTransferId,
	})
	if err != nil {
		tbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	tbSpan.End()

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_DB_QUERY)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryVoidPendingTransfer),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.TigerbeetleTransferId}),
	)

	result, err := s.db.ExecContext(ctx, queries.QueryVoidPendingTransfer, req.TigerbeetleTransferId)
	if err != nil {
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	rows, err := result.RowsAffected()
	if err != nil || rows == 0 {
		dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS_AFFECTED)
		return nil, lib.ErrNotFound
	}

	dbSpan.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rows),
	)
	dbSpan.End()

	return &pb.Empty{}, nil
}

func (s *StripeServiceServer) CreateAndPostTransfer(ctx context.Context, req *pb.CreateAndPostTransferRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_STRIPE_CUSTOMER_ID, req.StripeCustomerId),
		attribute.String(lib.ATTR_STRIPE_PAYMENT_INTENT_ID, req.StripePaymentIntentId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	ctx, tbSpan := tracer.Start(ctx, lib.EVENT_TB_CREATE_TRANSFER)
	defer tbSpan.End()

	tbSpan.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_STRIPE_CUSTOMER_ID, req.StripeCustomerId),
		attribute.String(lib.ATTR_STRIPE_PAYMENT_INTENT_ID, req.StripePaymentIntentId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	transfer, err := s.tigerbeetleService.CreateTransfer(ctx, &tbPb.CreateTransferRequest{
		CreditAccountId: lib.SYSTEM_FLOAT_ACCOUNT_ID,
		DebitAccountId:  req.UserId,
		Amount:          req.Amount,
	})
	if err != nil {
		tbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	tbSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, transfer.TransferId),
	)
	tbSpan.End()

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_DB_QUERY)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryCreateAndPostTransfer),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripePaymentIntentId, transfer.TransferId, req.StripeCustomerId, req.UserId}),
	)

	_, err = s.db.ExecContext(ctx, queries.QueryCreateAndPostTransfer, req.StripePaymentIntentId, transfer.TransferId, req.StripeCustomerId, req.UserId)
	if err != nil {
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	dbSpan.End()

	return &pb.Empty{}, nil
}

func (s *StripeServiceServer) CreatePendingTransfer(ctx context.Context, req *pb.CreatePendingTransferRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_STRIPE_CUSTOMER_ID, req.StripeCustomerId),
		attribute.String(lib.ATTR_STRIPE_PAYMENT_INTENT_ID, req.StripePaymentIntentId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	ctx, tbSpan := tracer.Start(ctx, lib.EVENT_TB_CREATE_PENDING_TRANSFER)
	defer tbSpan.End()

	tbSpan.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_STRIPE_CUSTOMER_ID, req.StripeCustomerId),
		attribute.String(lib.ATTR_STRIPE_PAYMENT_INTENT_ID, req.StripePaymentIntentId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	transfer, err := s.tigerbeetleService.CreatePendingTransfer(ctx, &tbPb.CreatePendingRequest{
		CreditAccountId: lib.SYSTEM_FLOAT_ACCOUNT_ID,
		DebitAccountId:  req.UserId,
		Amount:          req.Amount,
	})
	if err != nil {
		tbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	tbSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, transfer.TransferId),
	)
	tbSpan.End()

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_DB_QUERY)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryCreatePendingTransfer),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripePaymentIntentId, transfer.TransferId, req.StripeCustomerId, req.UserId}),
	)

	_, err = s.db.ExecContext(ctx, queries.QueryCreatePendingTransfer, req.StripePaymentIntentId, transfer.TransferId, req.StripeCustomerId, req.UserId)
	if err != nil {
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	dbSpan.End()

	return &pb.Empty{}, nil
}
