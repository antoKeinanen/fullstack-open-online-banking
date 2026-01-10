package queries

var (
	QueryGetStripeAccountId = `
		select stripe_account_id
		from banking.users
		where user_id = $1
	`

	QuerySetStripeAccountId = `
		update banking.users
		set stripe_account_id = $1
		where  user_id = $2
	`
)
