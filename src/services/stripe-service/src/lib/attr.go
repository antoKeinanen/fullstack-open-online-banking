package lib

const (
	ATTR_USER_ID = "user.id"

	ATTR_TB_TRANSFER_ID     = "tb.transfer.id"
	ATTR_TB_TRANSFER_AMOUNT = "tb.transfer.amount"

	ATTR_STRIPE_CUSTOMER_ID       = "stripe.customer.id"
	ATTR_STRIPE_ACCOUNT_ID        = "stripe.account.id"
	ATTR_STRIPE_PAYMENT_INTENT_ID = "stripe.payment_intent.id"
	ATTR_STRIPE_PAYOUT_ID         = "stripe.payout.id"

	ATTR_DB_QUERY         = "db.query"
	ATTR_DB_ARGS          = "db.args"
	ATTR_DB_ROWS_AFFECTED = "db.rows_affected"
)

const (
	EVENT_TB_CREATE_TRANSFER         = "tb.transfer.create"
	EVENT_TB_CREATE_PENDING_TRANSFER = "tb.transfer.pending.create"
	EVENT_TB_POST_PENDING_TRANSFER   = "tb.transfer.pending.post"
	EVENT_TB_VOID_PENDING_TRANSFER   = "tb.transfer.pending.void"

	EVENT_DB_QUERY            = "db.query.execute"
	EVENT_DB_NO_ROWS          = "db.no_rows"
	EVENT_DB_NO_ROWS_AFFECTED = "db.no_rows_affected"

	EVENT_CUSTOMER_SET_STRIPE_ID = "customer.set_stripe_id"
	EVENT_CUSTOMER_GET_STRIPE_ID = "customer.get_stripe_id"
	EVENT_CUSTOMER_GET_USER_ID   = "customer.get_user_id"

	EVENT_ACCOUNT_SET_STRIPE_ID = "account.set_stripe_id"
	EVENT_ACCOUNT_GET_STRIPE_ID = "account.get_stripe_id"

	EVENT_TRANSFER_GET_PENDING = "transfer.get_pending"

	EVENT_PAYOUT_CREATE_PENDING = "payout.pending.create"
	EVENT_PAYOUT_POST_PENDING   = "payout.pending.post"
	EVENT_PAYOUT_VOID_PENDING   = "payout.pending.void"
)
