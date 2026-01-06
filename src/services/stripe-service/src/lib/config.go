package lib

import (
	"log/slog"
	"os"
)

const SYSTEM_FLOAT_ACCOUNT_ID = "1"

type Configuration struct {
	StripeServicePort        string
	TigerbeetleServiceUrl    string
	StripeServiceDatabaseDsn string
}

func GetEnv(envName string) string {
	variable := os.Getenv(envName)
	if len(variable) == 0 {
		slog.Error("Missing env variable", "name", envName)
		panic("Missing env variable")
	}
	return variable
}

func ParseConfiguration() *Configuration {
	return &Configuration{
		StripeServicePort:        GetEnv("STRIPE_SERVICE_PORT"),
		TigerbeetleServiceUrl:    GetEnv("STRIPE_SERVICE_TIGERBEETLE_SERVICE_URL"),
		StripeServiceDatabaseDsn: GetEnv("STRIPE_SERVICE_DATABASE_DSN"),
	}
}
