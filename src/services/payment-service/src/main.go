package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net"
	"payment-service/src/lib"
	pb "protobufs/gen/go/payment-service"
	tbPb "protobufs/gen/go/tigerbeetle-service"

	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
	oteltrace "go.opentelemetry.io/otel/trace"
)

type PaymentServiceServer struct {
	pb.UnimplementedPaymentServiceServer

	db                           *sqlx.DB
	config                       *lib.Configuration
	tigerbeetleServiceClient     tbPb.TigerbeetleServiceClient
	tigerbeetleServiceConnection *grpc.ClientConn
}

func initTracer(config *lib.Configuration) func() {
	grpcExporter, err := otlptracegrpc.New(
		context.Background(),
		otlptracegrpc.WithEndpoint(config.OtelExporterOtlpEndpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		log.Fatal(err)
	}

	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(lib.ServiceName),
		),
	)
	if err != nil {
		log.Fatal(err)
	}

	tp := trace.NewTracerProvider(
		trace.WithResource(res),
		trace.WithBatcher(grpcExporter),
	)
	otel.SetTracerProvider(tp)

	otel.SetTextMapPropagator(propagation.TraceContext{})

	return func() {
		tp.Shutdown(context.Background())
	}
}

func (s *PaymentServiceServer) CreatePayment(ctx context.Context, req *pb.CreatePaymentRequest) (*pb.CreatePaymentResponse, error) {
	span := oteltrace.SpanFromContext(ctx)
	tracer := span.TracerProvider().Tracer(lib.ServiceName)

	amount := tbt.ToUint128(req.Amount).String()

	span.SetAttributes(
		attribute.String(lib.ATTR_TB_DEBIT_ACCOUNT_ID, req.ToUserId),
		attribute.String(lib.ATTR_TB_CREDIT_ACCOUNT_ID, req.FromUserId),
		attribute.String(lib.ATTR_TB_TRANSFER_AMOUNT, amount),
	)

	ctx, createTransferSpan := tracer.Start(ctx, lib.EVENT_TB_CREATE_TRANSFER)
	defer createTransferSpan.End()

	transferResp, err := s.tigerbeetleServiceClient.CreateTransfer(
		ctx,
		&tbPb.CreateTransferRequest{
			CreditAccountId: req.FromUserId,
			DebitAccountId:  req.ToUserId,
			Amount:          amount,
		},
	)
	if err != nil {
		createTransferSpan.RecordError(err)
		return nil, err
	}

	createTransferSpan.SetAttributes(
		attribute.String(lib.ATTR_TB_TRANSFER_ID, transferResp.TransferId),
	)
	createTransferSpan.End()

	ctx, dbSpan := tracer.Start(ctx, lib.EVENT_DB_CREATE_TRANSFER)
	defer dbSpan.End()

	dbSpan.SetAttributes(
		attribute.String(lib.ATTR_DB_QUERY, lib.QueryInsertTransfer),
		attribute.StringSlice(lib.ATTR_DB_ARGS, []string{transferResp.TransferId, req.FromUserId, req.ToUserId, amount}),
	)

	result, err := s.db.ExecContext(ctx, lib.QueryInsertTransfer, transferResp.TransferId, req.FromUserId, req.ToUserId, amount)
	if err != nil {
		dbSpan.RecordError(err)
		return nil, err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		dbSpan.RecordError(err)
		return nil, err
	}

	dbSpan.SetAttributes(
		attribute.Int64(lib.ATTR_DB_ROWS_AFFECTED, rowsAffected),
	)
	dbSpan.End()

	return &pb.CreatePaymentResponse{}, nil
}

func newServer(config *lib.Configuration) *PaymentServiceServer {
	db, err := sqlx.Connect("postgres", config.PaymentServiceDatabaseDsn)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	log.Println("Connected to db")

	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
	}

	conn, err := grpc.NewClient(config.TigerbeetleServiceUrl, opts...)
	if err != nil {
		log.Fatalf("Failed to connect to the tigerbeetle service: %v", err)
	}
	tigerbeetleClient := tbPb.NewTigerbeetleServiceClient(conn)
	log.Println("Connected to tiger beetle service.")

	s := &PaymentServiceServer{
		db:                           db,
		config:                       config,
		tigerbeetleServiceClient:     tigerbeetleClient,
		tigerbeetleServiceConnection: conn,
	}

	return s
}

func main() {
	config := lib.ParseConfiguration()

	lis, err := net.Listen("tcp", fmt.Sprintf("0.0.0.0:%s", config.PaymentServicePort))
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	tracerCleanUp := initTracer(config)
	defer tracerCleanUp()

	opts := []grpc.ServerOption{
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
	}
	grpcServer := grpc.NewServer(opts...)

	server := newServer(config)
	defer server.db.Close()
	defer server.tigerbeetleServiceConnection.Close()

	pb.RegisterPaymentServiceServer(grpcServer, server)
	slog.Info("Service ready to accept connections", "service", lib.ServiceName, "port", config.PaymentServicePort)
	grpcServer.Serve(lis)
}
