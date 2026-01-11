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

func (s *StripeServiceServer) voidPendingTransferOnError(ctx context.Context, tracer trace.Tracer, userId, transferId, amount string) {
	ctx, voidSpan := tracer.Start(ctx, lib.EVENT_TB_VOID_PENDING_TRANSFER)
	defer voidSpan.End()

	voidSpan.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, userId),
		attribute.String(lib.ATTR_TB_TRANSFER_ID, transferId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, amount),
	)

	_, err := s.tigerbeetleService.VoidPendingTransfer(ctx, &tbPb.VoidPendingTransferRequest{
		CreditAccountId:   userId,
		DebitAccountId:    lib.SYSTEM_FLOAT_ACCOUNT_ID,
		Amount:            amount,
		PendingTransferId: transferId,
	})
	if err != nil {
		voidSpan.RecordError(err)
	}
}

func (s *StripeServiceServer) CreatePendingPayout(ctx context.Context, req *pb.CreatePendingPayoutRequest) (*pb.CreatePendingPayoutResponse, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_STRIPE_ACCOUNT_ID, req.StripeAccountId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	ctx, tbSpan := tracer.Start(ctx, lib.EVENT_TB_CREATE_PENDING_TRANSFER)
	defer tbSpan.End()

	transferResp, err := s.tigerbeetleService.CreatePendingTransfer(ctx, &tbPb.CreatePendingRequest{
		DebitAccountId:  lib.SYSTEM_FLOAT_ACCOUNT_ID,
		CreditAccountId: req.UserId,
		Amount:          req.Amount,
	})
	if err != nil {
		tbSpan.RecordError(err)
		return nil, err
	}

	tbSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, transferResp.TransferId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_PAYOUT_CREATE_PENDING)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryCreatePendingPayout),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{transferResp.TransferId, req.StripeAccountId, req.UserId}),
	)

	result, err := s.db.ExecContext(ctx, queries.QueryCreatePendingPayout, transferResp.TransferId, req.StripeAccountId, req.UserId)
	if err != nil {
		dbSpan.RecordError(err)
		s.voidPendingTransferOnError(ctx, tracer, req.UserId, transferResp.TransferId, req.Amount)
		return nil, lib.ErrUnexpected
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		dbSpan.RecordError(err)
		s.voidPendingTransferOnError(ctx, tracer, req.UserId, transferResp.TransferId, req.Amount)
		return nil, lib.ErrUnexpected
	}
	span.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rowsAffected),
	)

	return &pb.CreatePendingPayoutResponse{
		TigerbeetleTransferId: transferResp.TransferId,
	}, nil
}

func (s *StripeServiceServer) PostPendingPayout(ctx context.Context, req *pb.PostPendingPayoutRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_STRIPE_PAYOUT_ID, req.StripePayoutId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_DB_QUERY)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryGetPendingPayout),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripePayoutId}),
	)

	payout := repo.Payout{}
	err := s.db.GetContext(ctx, &payout, queries.QueryGetPendingPayout, req.StripePayoutId)
	if err != nil {
		if err == sql.ErrNoRows {
			dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS)
			return nil, lib.ErrNotFound
		}
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, payout.TigerbeetleTransferId),
		attribute.String(lib.ATTR_USER_ID, payout.UserId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)
	dbSpan.End()

	ctx, tbSpan := tracer.Start(ctx, lib.EVENT_TB_POST_PENDING_TRANSFER)
	defer tbSpan.End()

	tbSpan.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, payout.UserId),
		attribute.String(lib.ATTR_TB_TRANSFER_ID, payout.TigerbeetleTransferId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	_, err = s.tigerbeetleService.PostPendingTransfer(ctx, &tbPb.PostPendingTransferRequest{
		CreditAccountId:   payout.UserId,
		DebitAccountId:    lib.SYSTEM_FLOAT_ACCOUNT_ID,
		PendingTransferId: payout.TigerbeetleTransferId,
		Amount:            req.Amount,
	})
	if err != nil {
		tbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	tbSpan.End()

	ctx, updateDbSpan := tracer.Start(ctx, lib.EVENT_DB_QUERY)
	defer updateDbSpan.End()

	updateDbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryPostPendingPayout),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripePayoutId}),
	)

	result, err := s.db.ExecContext(ctx, queries.QueryPostPendingPayout, req.StripePayoutId)
	if err != nil {
		updateDbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	rows, err := result.RowsAffected()
	if err != nil {
		updateDbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if rows == 0 {
		updateDbSpan.AddEvent(lib.EVENT_DB_NO_ROWS_AFFECTED)
		return nil, lib.ErrNotFound
	}

	updateDbSpan.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rows),
	)
	updateDbSpan.End()

	return &pb.Empty{}, nil
}

func (s *StripeServiceServer) VoidPendingPayout(ctx context.Context, req *pb.VoidPendingPayoutRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_STRIPE_PAYOUT_ID, req.StripePayoutId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_DB_QUERY)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryGetPendingPayout),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripePayoutId}),
	)

	payout := repo.Payout{}
	err := s.db.GetContext(ctx, &payout, queries.QueryGetPendingPayout, req.StripePayoutId)
	if err != nil {
		if err == sql.ErrNoRows {
			dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS)
			return nil, lib.ErrNotFound
		}
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, payout.TigerbeetleTransferId),
		attribute.String(lib.ATTR_USER_ID, payout.UserId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)
	dbSpan.End()

	ctx, tbSpan := tracer.Start(ctx, lib.EVENT_TB_VOID_PENDING_TRANSFER)
	defer tbSpan.End()

	tbSpan.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, payout.UserId),
		attribute.String(lib.ATTR_TB_TRANSFER_ID, payout.TigerbeetleTransferId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, req.Amount),
	)

	_, err = s.tigerbeetleService.VoidPendingTransfer(ctx, &tbPb.VoidPendingTransferRequest{
		CreditAccountId:   payout.UserId,
		DebitAccountId:    lib.SYSTEM_FLOAT_ACCOUNT_ID,
		Amount:            req.Amount,
		PendingTransferId: payout.TigerbeetleTransferId,
	})
	if err != nil {
		tbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	tbSpan.End()

	ctx, updateDbSpan := tracer.Start(ctx, lib.EVENT_DB_QUERY)
	defer updateDbSpan.End()

	updateDbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryVoidPendingPayout),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripePayoutId}),
	)

	result, err := s.db.ExecContext(ctx, queries.QueryVoidPendingPayout, req.StripePayoutId)
	if err != nil {
		updateDbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	rows, err := result.RowsAffected()
	if err != nil || rows == 0 {
		updateDbSpan.AddEvent(lib.EVENT_DB_NO_ROWS_AFFECTED)
		return nil, lib.ErrNotFound
	}

	updateDbSpan.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rows),
	)
	updateDbSpan.End()

	return &pb.Empty{}, nil
}

func (s *StripeServiceServer) SetStripePayoutId(ctx context.Context, req *pb.SetStripePayoutIdRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, req.TigerbeetleTransferId),
		attribute.String(lib.ATTR_STRIPE_PAYOUT_ID, req.StripePayoutId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_DB_QUERY)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QuerySetStripePayoutId),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripePayoutId, req.TigerbeetleTransferId}),
	)

	result, err := s.db.ExecContext(ctx, queries.QuerySetStripePayoutId, req.StripePayoutId, req.TigerbeetleTransferId)
	if err != nil {
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	rows, err := result.RowsAffected()
	if err != nil {
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	if rows == 0 {
		dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS_AFFECTED)
		return nil, lib.ErrNotFound
	}

	dbSpan.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rows),
	)

	return &pb.Empty{}, nil
}
