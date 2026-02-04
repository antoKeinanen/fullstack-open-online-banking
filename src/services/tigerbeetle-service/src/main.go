package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"syscall"

	pb "protobufs/gen/go/tigerbeetle-service"
	"tigerbeetle-service/src/health"
	"tigerbeetle-service/src/lib"

	"google.golang.org/grpc"

	tb "github.com/tigerbeetle/tigerbeetle-go"
	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
)

type TigerbeetleServiceServer struct {
	pb.UnimplementedTigerbeetleServiceServer
	tbClient tb.Client
}

func initTracer(config Configuration) func() {
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

func newServer(configuration *Configuration) *TigerbeetleServiceServer {
	s := &TigerbeetleServiceServer{}

	client, err := tb.NewClient(tbt.ToUint128(0), []string{configuration.TigerbeetleAddress})
	if err != nil {
		log.Panicf("Error creating client: %s", err)
	}
	s.tbClient = client

	return s
}

func main() {
	configuration := ParseConfiguration()

	lis, err := net.Listen("tcp", fmt.Sprintf("0.0.0.0:%s", configuration.TigerbeetleServicePort))
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	tracerCleanUp := initTracer(*configuration)
	defer tracerCleanUp()

	opts := []grpc.ServerOption{
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
	}
	grpcServer := grpc.NewServer(opts...)

	server := newServer(configuration)
	defer server.tbClient.Close()

	// Setup health server
	healthServer := health.NewServer(lib.ServiceName)
	healthServer.Register(health.NewTigerbeetleChecker(server.tbClient))
	httpServer := healthServer.StartHTTPServer(configuration.TigerbeetleServiceHealthPort)
	defer httpServer.Shutdown(context.Background())

	// Mark as ready after all connections are established
	healthServer.SetReady(true)

	pb.RegisterTigerbeetleServiceServer(grpcServer, server)
	slog.Info("Service ready to accept connections", "service", lib.ServiceName, "port", configuration.TigerbeetleServicePort, "healthPort", configuration.TigerbeetleServiceHealthPort)

	// Handle graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		slog.Info("Shutting down gracefully...")
		healthServer.SetReady(false)
		grpcServer.GracefulStop()
	}()

	grpcServer.Serve(lis)
}
