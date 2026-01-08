package lib

import (
	"log"
	"os"
)

const (
	SYSTEM_FLOAT_ACCOUNT_ID = "1"
	ServiceName             = "stripe-service"
)

type Configuration struct {
	StripeServicePort        string
	TigerbeetleServiceUrl    string
	StripeServiceDatabaseDsn string
	OtelExporterOtlpEndpoint string
}

func GetEnv(envName string) string {
	variable := os.Getenv(envName)
	if len(variable) == 0 {
		log.Fatalf("Missing env variable: %s", envName)
	}
	return variable
}

func ParseConfiguration() *Configuration {
	return &Configuration{
		StripeServicePort:        GetEnv("STRIPE_SERVICE_PORT"),
		TigerbeetleServiceUrl:    GetEnv("STRIPE_SERVICE_TIGERBEETLE_SERVICE_URL"),
		StripeServiceDatabaseDsn: GetEnv("STRIPE_SERVICE_DATABASE_DSN"),
		OtelExporterOtlpEndpoint: GetEnv("STRIPE_SERVICE_OTEL_EXPORTER_OTLP_ENDPOINT"),
	}
}
