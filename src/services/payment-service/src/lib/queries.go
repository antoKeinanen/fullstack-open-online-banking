package lib

var (
	QueryInsertTransfer = `
	insert into banking.transfers  (tigerbeetle_transfer_id, from_user_id, to_user_id, amount)
	values ($1, $2, $3, $4)
	`
)
