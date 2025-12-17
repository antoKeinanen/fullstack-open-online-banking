package repo

import (
	pb "protobufs/gen/go/user-service"
	"time"
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

func DbUserToPbUser(dbUser User) *pb.User {
	return &pb.User{
		UserId:      dbUser.UserId,
		PhoneNumber: dbUser.PhoneNumber,
		FirstName:   dbUser.FirstName,
		LastName:    dbUser.LastName,
		Address:     dbUser.Address,
		BirthDate:   dbUser.BirthDate.UTC().Format(time.RFC3339),
		CreatedAt:   dbUser.CreatedAt.UTC().Format(time.RFC3339),
	}
}
