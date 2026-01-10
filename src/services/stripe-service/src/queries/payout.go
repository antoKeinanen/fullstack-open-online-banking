package queries

var (
	QueryCreatePendingPayout = `
		insert into banking.payouts (tigerbeetle_transfer_id, stripe_account_id, user_id, payment_status)
		values ($1, $2, $3, 'pending')
	`

	QueryGetPendingPayout = `
		select tigerbeetle_transfer_id, user_id
		from banking.payouts
		where stripe_payout_id = $1
	`

	QueryPostPendingPayout = `
		update banking.payouts
		set payment_status = 'posted',
    		posted_at      = now()
		where stripe_payout_id = $1
	`

	QueryVoidPendingPayout = `
		update banking.payouts
		set payment_status = 'voided',
    		voided_at      = now()
		where stripe_payout_id = $1
	`

	QuerySetStripePayoutId = `
		update banking.payouts
		set stripe_payout_id = $1
		where tigerbeetle_transfer_id = $2
	`
)
