package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net"
	tbPb "protobufs/gen/go/tigerbeetle-service"
	pb "protobufs/gen/go/user-service"

	"user-service/src/lib"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
)

type UserServiceServer struct {
	pb.UnimplementedUserServiceServer
	db                           *sqlx.DB
	config                       *lib.Configuration
	tigerbeetleService           tbPb.TigerbeetleServiceClient
	tigerbeetleServiceConnection *grpc.ClientConn
	tokenService                 *lib.TokenService
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

func newServer(config *lib.Configuration) *UserServiceServer {
	db, err := sqlx.Connect("postgres", config.UserServiceDatabaseDsn)
	if err != nil {

		slog.Error("Failed to connect to the database", "error", err)
		panic(err)
	}
	slog.Info("Connected to db")

	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
	}

	conn, err := grpc.NewClient(config.TigerbeetleServiceUrl, opts...)
	if err != nil {
		slog.Error("Failed to open Tigerbeetle service grpc connection", "error", err)
		panic(err)
	}
	client := tbPb.NewTigerbeetleServiceClient(conn)
	slog.Info("Connected to Tigerbeetle service grpc")

	tokenService := lib.NewTokenService(config.UserServiceJWTSecret)

	return &UserServiceServer{
		db:                           db,
		config:                       config,
		tigerbeetleServiceConnection: conn,
		tigerbeetleService:           client,
		tokenService:                 tokenService,
	}
}

func main() {
	config := lib.ParseConfiguration()
	lis, err := net.Listen("tcp", fmt.Sprintf("0.0.0.0:%s", config.UserServicePort))
	if err != nil {
		slog.Error("Failed to listen", "error", err)
		panic(err)
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

	pb.RegisterUserServiceServer(grpcServer, server)
	slog.Info("Service ready to accept connections", "service", lib.ServiceName, "port", config.UserServicePort)
	grpcServer.Serve(lis)
}
