package queries

var (
	QueryGetPendingTransfer = `
		select tigerbeetle_transfer_id, user_id
		from banking.deposits
		where stripe_payment_intent_id = $1 
			and payment_status = 'pending'
	`

	QueryVoidPendingTransfer = `
		update banking.deposits
		set voided_at = now(),
				payment_status = 'voided'
		where tigerbeetle_transfer_id = $1
			and payment_status = 'pending'
	`

	QueryPostPendingTransfer = `
		update banking.deposits
		set posted_at = now(),
				payment_status = 'posted'
		where tigerbeetle_transfer_id = $1
			and payment_status = 'pending'
	`

	QueryCreateAndPostTransfer = `
		insert into banking.deposits 
			(stripe_payment_intent_id, tigerbeetle_transfer_id, stripe_customer_id, user_id, payment_status, posted_at)
		values ($1, $2, $3, $4, 'posted', now())
	`

	QueryCreatePendingTransfer = `
		insert into banking.deposits
			(stripe_payment_intent_id, tigerbeetle_transfer_id, stripe_customer_id, user_id, payment_status)
		values ($1, $2, $3, $4, 'pending')
	`
)
