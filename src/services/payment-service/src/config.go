package main

import (
	"log"
	"os"
)

type Configuration struct {
	PaymentServicePort    string
	TigerbeetleServiceUrl string
}

func GetEnv(envName string) string {
	variable := os.Getenv(envName)
	if len(variable) == 0 {
		log.Fatalf("Missing env variable %s", envName)
	}
	return variable
}

func ParseConfiguration() *Configuration {
	return &Configuration{
		PaymentServicePort:    GetEnv("PAYMENT_SERVICE_PORT"),
		TigerbeetleServiceUrl: GetEnv("PAYMENT_SERVICE_TIGERBEETLE_SERVICE_URL"),
	}
}
