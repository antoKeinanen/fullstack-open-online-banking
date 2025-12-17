package repo

import (
	pb "protobufs/gen/go/user-service"
	"time"
)

type ActiveSession struct {
	SessionId   string    `db:"session_id"`
	CreatedAt   time.Time `db:"created_at"`
	Expires     time.Time `db:"expires"`
	Device      string    `db:"device"`
	Application string    `db:"application"`
	IpAddress   string    `db:"ip_address"`
}

func DbActiveSessionToPbActiveSession(session ActiveSession) *pb.ActiveSession {
	return &pb.ActiveSession{
		SessionId:   session.SessionId,
		CreatedAt:   session.CreatedAt.UTC().Format(time.RFC3339),
		Expires:     session.Expires.UTC().Format(time.RFC3339),
		Device:      session.Device,
		Application: session.Application,
		IpAddress:   session.IpAddress,
	}
}
