package queries

var (
	QuerySetStripeCustomerId = `
		update banking.users
		set stripe_customer_id = $1
		where user_id = $2
	`
	QueryGetStripeCustomerId = `
		select stripe_customer_id
		from banking.users
		where user_id = $1
	`
)
