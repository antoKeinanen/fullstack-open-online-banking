package repo

type StripeCustomerId struct {
	StripeCustomerId *string `db:"stripe_customer_id"`
}

type UserId struct {
	UserId *string `db:"user_id"`
}
