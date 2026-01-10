package main

import (
	"context"
	"database/sql"
	pb "protobufs/gen/go/stripe-service"
	"stripe-service/src/lib"
	"stripe-service/src/queries"
	"stripe-service/src/repo"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

func (s *StripeServiceServer) SetStripeAccountId(ctx context.Context, req *pb.SetStripeAccountIdRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_STRIPE_ACCOUNT_ID, req.StripeAccountId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_ACCOUNT_SET_STRIPE_ID)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QuerySetStripeAccountId),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripeAccountId, req.UserId}),
	)

	result, err := s.db.ExecContext(ctx, queries.QuerySetStripeAccountId, req.StripeAccountId, req.UserId)
	if err != nil {
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	dbSpan.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rowsAffected),
	)
	dbSpan.End()

	return &pb.Empty{}, nil

}

func (s *StripeServiceServer) GetStripeAccountId(ctx context.Context, req *pb.GetStripeAccountIdRequest) (*pb.GetStripeAccountIdResponse, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_ACCOUNT_GET_STRIPE_ID)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryGetStripeAccountId),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.UserId}),
	)

	stripeAccountId := repo.StripeAccountId{}
	err := s.db.GetContext(ctx, &stripeAccountId, queries.QueryGetStripeAccountId, req.UserId)
	if err != nil {
		if err == sql.ErrNoRows {
			dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS)
			return &pb.GetStripeAccountIdResponse{
				StripeAccountId: "",
			}, nil
		}

		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	if stripeAccountId.StripeAccountId == nil {
		dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS)
		return &pb.GetStripeAccountIdResponse{
			StripeAccountId: "",
		}, nil
	}
	dbSpan.End()

	span.SetAttributes(
		attribute.String(lib.ATTR_STRIPE_ACCOUNT_ID, *stripeAccountId.StripeAccountId),
	)

	return &pb.GetStripeAccountIdResponse{
		StripeAccountId: *stripeAccountId.StripeAccountId,
	}, nil
}
