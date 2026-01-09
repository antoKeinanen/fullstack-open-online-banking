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

func (s *StripeServiceServer) SetStripeCustomerId(ctx context.Context, req *pb.SetStripeCustomerIdRequest) (*pb.Empty, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.String(lib.ATTR_STRIPE_CUSTOMER_ID, req.StripeCustomerId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_CUSTOMER_SET_STRIPE_ID)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QuerySetStripeCustomerId),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripeCustomerId, req.UserId}),
	)

	result, err := s.db.ExecContext(ctx, queries.QuerySetStripeCustomerId, req.StripeCustomerId, req.UserId)
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

func (s *StripeServiceServer) GetStripeCustomerId(ctx context.Context, req *pb.GetStripeCustomerIdRequest) (*pb.GetStripeCustomerIdResponse, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_CUSTOMER_GET_STRIPE_ID)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryGetStripeCustomerId),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.UserId}),
	)

	stripeCustomerId := repo.StripeCustomerId{}
	err := s.db.GetContext(ctx, &stripeCustomerId, queries.QueryGetStripeCustomerId, req.UserId)
	if err != nil {
		if err == sql.ErrNoRows {
			dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS)
			return &pb.GetStripeCustomerIdResponse{
				StripeCustomerId: "",
			}, nil
		}

		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	if stripeCustomerId.StripeCustomerId == nil {
		dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS)
		return &pb.GetStripeCustomerIdResponse{
			StripeCustomerId: "",
		}, nil
	}

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_STRIPE_CUSTOMER_ID, *stripeCustomerId.StripeCustomerId),
	)
	dbSpan.End()

	return &pb.GetStripeCustomerIdResponse{
		StripeCustomerId: *stripeCustomerId.StripeCustomerId,
	}, nil
}

func (s *StripeServiceServer) GetUserId(ctx context.Context, req *pb.GetUserIdRequest) (*pb.GetUserIdResponse, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_STRIPE_CUSTOMER_ID, req.StripeCustomerId),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_CUSTOMER_GET_USER_ID)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryGetUserId),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.StripeCustomerId}),
	)

	userId := repo.UserId{}
	err := s.db.GetContext(ctx, &userId, queries.QueryGetUserId, req.StripeCustomerId)
	if err != nil {
		if err == sql.ErrNoRows {
			dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS)
			return &pb.GetUserIdResponse{
				UserId: "",
			}, nil
		}

		dbSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	if userId.UserId == nil {
		dbSpan.AddEvent(lib.EVENT_DB_NO_ROWS)
		return &pb.GetUserIdResponse{
			UserId: "",
		}, nil
	}

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, *userId.UserId),
	)
	dbSpan.End()

	return &pb.GetUserIdResponse{
		UserId: *userId.UserId,
	}, nil
}
