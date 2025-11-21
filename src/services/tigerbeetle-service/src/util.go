package main

import (
	"log"
	"os"
	pb "protobufs/gen/go/tigerbeetle-service"

	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

type Configuration struct {
	TigerbeetleServicePort string
	TigerbeetleAddress     string
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
		TigerbeetleServicePort: GetEnv("TIGERBEETLE_SERVICE_PORT"),
		TigerbeetleAddress:     GetEnv("TIGERBEETLE_ADDRESS"),
	}
}

func Uint128ToHexString(number tbt.Uint128) string {
	return number.String()
}

func ToPbAccount(account tbt.Account) *pb.Account {
	userData128 := Uint128ToHexString(account.UserData128)

	return &pb.Account{
		AccountId:      Uint128ToHexString(account.ID),
		DebitsPending:  Uint128ToHexString(account.DebitsPending),
		DebitsPosted:   Uint128ToHexString(account.DebitsPosted),
		CreditsPending: Uint128ToHexString(account.CreditsPending),
		CreditsPosted:  Uint128ToHexString(account.CreditsPosted),
		Code:           uint32(account.Code),
		Timestamp:      account.Timestamp,
		Flags:          uint32(account.Flags),
		Ledger:         account.Ledger,
		UserData128:    &userData128,
		UserData64:     &account.UserData64,
		UserData32:     &account.UserData32,
	}
}

func ToPbTransfer(transfer tbt.Transfer) *pb.Transfer {
	return &pb.Transfer{
		TransferId:      Uint128ToHexString(transfer.ID),
		DebitAccountId:  Uint128ToHexString(transfer.DebitAccountID),
		CreditAccountId: Uint128ToHexString(transfer.CreditAccountID),
		Amount:          Uint128ToHexString(transfer.Amount),
	}
}
