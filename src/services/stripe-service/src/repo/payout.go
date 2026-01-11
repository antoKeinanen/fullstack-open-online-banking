package repo

type Payout struct {
	TigerbeetleTransferId string `db:"tigerbeetle_transfer_id"`
	UserId                string `db:"user_id"`
}
