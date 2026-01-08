package main

import (
	"context"
	"fmt"
	"log"
	"net"
	pb "protobufs/gen/go/stripe-service"
	tbPb "protobufs/gen/go/tigerbeetle-service"

	"stripe-service/src/lib"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
)

type StripeServiceServer struct {
	pb.UnimplementedStripeServiceServer
	db                           *sqlx.DB
	config                       *lib.Configuration
	tigerbeetleService           tbPb.TigerbeetleServiceClient
	tigerbeetleServiceConnection *grpc.ClientConn
}

func initTracer(config lib.Configuration) func() {
	stdoutExporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
	if err != nil {
		log.Fatal(err)
	}

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
		trace.WithBatcher(stdoutExporter),
	)
	otel.SetTracerProvider(tp)

	otel.SetTextMapPropagator(propagation.TraceContext{})

	return func() {
		tp.Shutdown(context.Background())
	}
}

func newServer(config *lib.Configuration) *StripeServiceServer {
	db, err := sqlx.Connect("postgres", config.StripeServiceDatabaseDsn)
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
		log.Fatalf("Failed to open Tigerbeetle service grpc connection: %v", err)
	}
	client := tbPb.NewTigerbeetleServiceClient(conn)
	log.Println("Connected to Tigerbeetle service grpc")

	return &StripeServiceServer{
		db:                           db,
		config:                       config,
		tigerbeetleServiceConnection: conn,
		tigerbeetleService:           client,
	}
}

func main() {
	config := lib.ParseConfiguration()
	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%s", config.StripeServicePort))
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	tracerCleanUp := initTracer(*config)
	defer tracerCleanUp()

	opts := []grpc.ServerOption{
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
	}
	grpcServer := grpc.NewServer(opts...)

	server := newServer(config)
	defer server.db.Close()
	defer server.tigerbeetleServiceConnection.Close()

	pb.RegisterStripeServiceServer(grpcServer, server)
	grpcServer.Serve(lis)
}
