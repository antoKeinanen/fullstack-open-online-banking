package lib

import (
	"log"
	"os"
)

type Configuration struct {
	PaymentServicePort        string
	PaymentServiceHealthPort  string
	TigerbeetleServiceUrl     string
	PaymentServiceDatabaseDsn string
	OtelExporterOtlpEndpoint  string
}

func GetEnv(envName string) string {
	variable := os.Getenv(envName)
	if len(variable) == 0 {
		log.Fatalf("Missing env variable: %s", envName)
	}
	return variable
}

func GetEnvOrDefault(envName string, defaultValue string) string {
	variable := os.Getenv(envName)
	if len(variable) == 0 {
		return defaultValue
	}
	return variable
}

func ParseConfiguration() *Configuration {
	return &Configuration{
		PaymentServicePort:        GetEnv("PAYMENT_SERVICE_PORT"),
		PaymentServiceHealthPort:  GetEnvOrDefault("PAYMENT_SERVICE_HEALTH_PORT", "8081"),
		TigerbeetleServiceUrl:     GetEnv("PAYMENT_SERVICE_TIGERBEETLE_SERVICE_URL"),
		PaymentServiceDatabaseDsn: GetEnv("PAYMENT_SERVICE_DATABASE_DSN"),
		OtelExporterOtlpEndpoint:  GetEnv("PAYMENT_SERVICE_OTEL_EXPORTER_OTLP_ENDPOINT"),
	}
}
