package repo

import (
	"context"
	"log/slog"
	"math/big"
	pb "protobufs/gen/go/user-service"
	"time"
	"user-service/src/lib"
	"user-service/src/queries"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	tbt "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

type User struct {
	UserId      string    `db:"user_id"`
	PhoneNumber string    `db:"phone_number"`
	FirstName   string    `db:"first_name"`
	LastName    string    `db:"last_name"`
	Address     string    `db:"address"`
	BirthDate   time.Time `db:"birth_date"`
	CreatedAt   time.Time `db:"created_at"`
}

func HexStringToBigInt(str string) (*big.Int, error) {
	unit128, err := tbt.HexStringToUint128(str)
	if err != nil {
		return nil, err
	}
	bigInt := tbt.Uint128.BigInt(unit128)
	return &bigInt, nil
}

func DbUserToPbUser(dbUser User, credits, debits, pendingDebits, pendingCredits string) (*pb.User, error) {

	creditsBig, err := HexStringToBigInt(credits)
	if err != nil {
		slog.Error("Failed to parse credits hex to bigInt", "error", err)
		return nil, lib.ErrUnexpected
	}
	debitsBig, err := HexStringToBigInt(debits)
	if err != nil {
		slog.Error("Failed to parse debits to hex bigInt", "error", err)
		return nil, lib.ErrUnexpected
	}

	balance := big.NewInt(0).Sub(debitsBig, creditsBig).Text(16)

	return &pb.User{
		UserId:         dbUser.UserId,
		PhoneNumber:    dbUser.PhoneNumber,
		FirstName:      dbUser.FirstName,
		LastName:       dbUser.LastName,
		Address:        dbUser.Address,
		BirthDate:      dbUser.BirthDate.UTC().Format(time.RFC3339),
		CreatedAt:      dbUser.CreatedAt.UTC().Format(time.RFC3339),
		Balance:        balance,
		PendingDebits:  pendingDebits,
		PendingCredits: pendingCredits,
	}, nil
}

type DbUserIdToNameMap struct {
	FirstName string `db:"first_name"`
	LastName  string `db:"last_name"`
	UserId    string `db:"user_id"`
}

func MapUserIdsToUsernames(ctx context.Context, db *sqlx.DB, ids []string) (map[string]string, error) {
	result := make(map[string]string)

	rows, err := db.QueryxContext(ctx, queries.QueryMapUserIdsToNames, pq.Array(ids))
	if err != nil {
		slog.Error("Failed to map user ids to names", "error", err)
		return result, lib.ErrUnexpected
	}
	defer rows.Close()

	for rows.Next() {
		var user DbUserIdToNameMap
		if err := rows.StructScan(&user); err != nil {
			slog.Error("Failed to scan user row", "error", err)
			return result, lib.ErrUnexpected
		}
		result[user.UserId] = lib.FormatName(user.FirstName, user.LastName)
	}

	if err := rows.Err(); err != nil {
		slog.Error("Error iterating rows", "error", err)
		return result, lib.ErrUnexpected
	}

	return result, nil

}
