package main

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"user-service/src/lib"
	"user-service/src/queries"
	"user-service/src/repo"

	"github.com/lib/pq"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	tbPb "protobufs/gen/go/tigerbeetle-service"
	pb "protobufs/gen/go/user-service"
)

func (s *UserServiceServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_PHONE_NUMBER, lib.RedactPhoneNumber(req.PhoneNumber)),
		attribute.String(lib.ATTR_BIRTH_DATE, req.BirthDate),
	)

	ctx, parseBirthDateSpan := tracer.Start(ctx, lib.EVENT_USER_PARSE_BIRTH_DATE)
	defer parseBirthDateSpan.End()

	birthDate, err := time.Parse(time.RFC3339, req.BirthDate)
	if err != nil {
		parseBirthDateSpan.RecordError(err)
		return nil, lib.ErrUnacceptableRequest
	}
	parseBirthDateSpan.End()

	ctx, validateAgeSpan := tracer.Start(ctx, lib.EVENT_USER_VALIDATE_AGE)
	defer validateAgeSpan.End()

	now := time.Now().UTC()
	if birthDate.AddDate(18, 0, 0).After(now) {
		validateAgeSpan.AddEvent(lib.EVENT_USER_UNDERAGE)
		return nil, lib.ErrUnacceptableRequest
	}
	validateAgeSpan.End()

	ctx, createTbAccountSpan := tracer.Start(ctx, lib.EVENT_TB_CREATE_ACCOUNT)
	defer createTbAccountSpan.End()

	tbUser, err := s.tigerbeetleService.CreateAccount(ctx, &tbPb.Empty{})
	if err != nil {
		createTbAccountSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	createTbAccountSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_ACCOUNT_ID, tbUser.AccountId),
	)
	createTbAccountSpan.End()

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, tbUser.AccountId),
	)

	ctx, dbCreateUserSpan := tracer.Start(ctx, lib.EVENT_DB_CREATE_USER)
	defer dbCreateUserSpan.End()

	dbCreateUserSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryCreateUser),
	)

	user := repo.User{}
	err = s.db.GetContext(ctx, &user, queries.QueryCreateUser, tbUser.AccountId, req.PhoneNumber, req.FirstName, req.LastName, req.Address, birthDate)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			dbCreateUserSpan.AddEvent(lib.EVENT_DB_UNIQUE_CONSTRAINT_VIOLATION)
			dbCreateUserSpan.RecordError(err)
			return nil, lib.ErrConflict
		}

		dbCreateUserSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	dbCreateUserSpan.End()

	return repo.DbUserToPbUser(user, "0", "0", "0", "0")
}

func (s *UserServiceServer) GetUserById(ctx context.Context, req *pb.GetUserByIdRequest) (*pb.User, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
	)

	ctx, dbGetUserSpan := tracer.Start(ctx, lib.EVENT_DB_GET_USER)
	defer dbGetUserSpan.End()

	dbGetUserSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryGetUserById),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{req.UserId}),
	)

	user := repo.User{}
	err := s.db.GetContext(ctx, &user, queries.QueryGetUserById, req.UserId)
	if err != nil {
		if err == sql.ErrNoRows {
			dbGetUserSpan.AddEvent(lib.EVENT_USER_NOT_FOUND)
			return nil, lib.ErrNotFound
		}

		dbGetUserSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	dbGetUserSpan.End()

	ctx, lookupAccountSpan := tracer.Start(ctx, lib.EVENT_TB_LOOKUP_ACCOUNT)
	defer lookupAccountSpan.End()

	lookupAccountSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_ACCOUNT_ID, req.UserId),
	)

	account, err := s.tigerbeetleService.LookupAccount(ctx, &tbPb.AccountId{AccountId: req.UserId})
	if err != nil {
		if err == lib.ErrNotFound {
			lookupAccountSpan.AddEvent(lib.EVENT_ACCOUNT_NOT_FOUND)
			return nil, lib.ErrNotFound
		}
		lookupAccountSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	lookupAccountSpan.End()

	return repo.DbUserToPbUser(user, account.CreditsPosted, account.DebitsPosted, account.DebitsPending, account.CreditsPending)
}

func (s *UserServiceServer) GetUserByPhoneNumber(ctx context.Context, req *pb.GetUserByPhoneNumberRequest) (*pb.User, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_PHONE_NUMBER, lib.RedactPhoneNumber(req.PhoneNumber)),
	)

	ctx, dbGetUserSpan := tracer.Start(ctx, lib.EVENT_DB_GET_USER)
	defer dbGetUserSpan.End()

	dbGetUserSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, queries.QueryGetUserByPhoneNumber),
	)

	user := repo.User{}
	err := s.db.GetContext(ctx, &user, queries.QueryGetUserByPhoneNumber, req.PhoneNumber)
	if err != nil {
		if err == sql.ErrNoRows {
			dbGetUserSpan.AddEvent(lib.EVENT_USER_NOT_FOUND)
			return nil, lib.ErrNotFound
		}

		dbGetUserSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, user.UserId),
	)
	dbGetUserSpan.End()

	ctx, lookupAccountSpan := tracer.Start(ctx, lib.EVENT_TB_LOOKUP_ACCOUNT)
	defer lookupAccountSpan.End()

	lookupAccountSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_ACCOUNT_ID, user.UserId),
	)

	account, err := s.tigerbeetleService.LookupAccount(ctx, &tbPb.AccountId{AccountId: user.UserId})
	if err != nil {
		if err == lib.ErrNotFound {
			lookupAccountSpan.AddEvent(lib.EVENT_ACCOUNT_NOT_FOUND)
			return nil, lib.ErrNotFound
		}
		lookupAccountSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}
	lookupAccountSpan.End()

	return repo.DbUserToPbUser(user, account.CreditsPosted, account.DebitsPosted, account.DebitsPending, account.CreditsPending)
}

func (s *UserServiceServer) GetUserTransfers(ctx context.Context, req *pb.GetUserTransfersRequest) (*pb.GetUserTransfersResponse, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
	)

	ctx, getTransfersSpan := tracer.Start(ctx, lib.EVENT_TB_GET_TRANSFERS)
	defer getTransfersSpan.End()

	tbReq := tbPb.GetAccountTransfersRequest{
		UserId:       req.UserId,
		MinTimestamp: req.MinTimestamp,
		MaxTimestamp: req.MaxTimestamp,
		Limit:        req.Limit,
	}

	transfers, err := s.tigerbeetleService.GetAccountTransfers(ctx, &tbReq)
	if err != nil {
		getTransfersSpan.RecordError(err)
		return nil, lib.ErrUnexpected
	}

	getTransfersSpan.SetAttributes(
		attribute.Int(lib.ATTR_TB_TRANSFER_COUNT, len(transfers.Transfers)),
	)
	getTransfersSpan.End()

	userIds := make([]string, len(transfers.Transfers)*2)
	for i, transfer := range transfers.Transfers {
		userIds[i*2] = transfer.DebitAccountId
		userIds[i*2+1] = transfer.CreditAccountId
	}
	userIds = lib.RemoveDuplicates(userIds)

	ctx, mapUserIdsSpan := tracer.Start(ctx, lib.EVENT_MAP_USER_IDS)
	defer mapUserIdsSpan.End()

	userIdToName, err := repo.MapUserIdsToUsernames(ctx, s.db, userIds)
	if err != nil {
		mapUserIdsSpan.RecordError(err)
		return nil, err
	}
	mapUserIdsSpan.End()

	pbTransfers := make([]*pb.Transfer, len(transfers.Transfers))
	for i, transfer := range transfers.Transfers {
		debitUser := userIdToName[transfer.DebitAccountId]
		creditUser := userIdToName[transfer.CreditAccountId]

		pbTransfers[i] = repo.TbTransferToPbTransfer(transfer, debitUser, creditUser, req.UserId)
	}

	return &pb.GetUserTransfersResponse{
		Transfers: pbTransfers,
	}, nil
}

func (s *UserServiceServer) GetSuggestedUsers(ctx context.Context, req *pb.GetSuggestedUsersRequest) (*pb.GetSuggestedUsersResponse, error) {
	span := trace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	span.SetAttributes(
		attribute.String(lib.ATTR_USER_ID, req.UserId),
		attribute.Int64(lib.ATTR_SUGGESTED_USERS_LIMIT, int64(req.Limit)),
	)

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_GET_SUGGESTED_USERS_DB)
	defer dbSpan.End()

	users, err := repo.GetSuggestedUsers(ctx, s.db, req.UserId, req.Limit)
	if err != nil {
		dbSpan.RecordError(err)
		dbSpan.End()
		return nil, lib.ErrUnexpected
	}
	dbSpan.End()

	pbUsers := make([]*pb.SuggestedUser, len(users))
	for i, user := range users {
		pbUsers[i] = &pb.SuggestedUser{
			UserId:      user.UserId,
			PhoneNumber: user.PhoneNumber,
			FirstName:   user.FirstName,
			LastName:    user.LastName,
		}
	}

	return &pb.GetSuggestedUsersResponse{
		Users: pbUsers,
	}, nil
}
