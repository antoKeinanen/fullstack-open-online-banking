package lib

import (
	"log"
	"os"
	"time"
)

const (
	OTPLength                  = 6
	AccessTokenTTL             = 5 * time.Minute
	RefreshTokenTTL            = 30 * time.Minute
	OTPExpirationWindowMinutes = 5
)

type Configuration struct {
	UserServicePort        string
	TigerbeetleServiceUrl  string
	UserServiceDatabaseDsn string
	UserServiceJWTSecret   string
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
		UserServicePort:        GetEnv("USER_SERVICE_PORT"),
		TigerbeetleServiceUrl:  GetEnv("USER_SERVICE_TIGERBEETLE_SERVICE_URL"),
		UserServiceDatabaseDsn: GetEnv("USER_SERVICE_DATABASE_DSN"),
		UserServiceJWTSecret:   GetEnv("USER_SERVICE_JWT_SECRET"),
	}
}
