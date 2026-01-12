package lib

const ServiceName = "payment-service"

const (
	ATTR_TB_TRANSFER_ID       = "tb.transfer.id"
	ATTR_TB_TRANSFER_AMOUNT   = "tb.transfer.amount"
	ATTR_TB_DEBIT_ACCOUNT_ID  = "tb.debit_account.id"
	ATTR_TB_CREDIT_ACCOUNT_ID = "tb.credit_account.id"

	ATTR_DB_QUERY         = "db.query"
	ATTR_DB_ARGS          = "db.args"
	ATTR_DB_ROWS_AFFECTED = "db.rows_affected"
)

const (
	EVENT_TB_CREATE_TRANSFER = "tb.transfer.create"
	EVENT_DB_CREATE_TRANSFER = "db.transfer.create"
)
