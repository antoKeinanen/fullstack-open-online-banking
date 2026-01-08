package main

import (
	"context"
	"fmt"
	"log"
	"net"

	pb "protobufs/gen/go/tigerbeetle-service"
	"tigerbeetle-service/src/lib"

	"google.golang.org/grpc"

	tb "github.com/tigerbeetle/tigerbeetle-go"
	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
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

	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%s", configuration.TigerbeetleServicePort))
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

	pb.RegisterTigerbeetleServiceServer(grpcServer, server)
	grpcServer.Serve(lis)
}
