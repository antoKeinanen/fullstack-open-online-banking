package repo

type Transfer struct {
	TigerbeetleTransferId string `db:"tigerbeetle_transfer_id"`
	UserId                string `db:"user_id"`
}
