package lib

const ServiceName = "tigerbeetle-service"

const (
	ATTR_TB_ACCOUNT_ID = "tb.account.id"

	ATTR_TB_TRANSFER_ID         = "tb.transfer.id"
	ATTR_TB_TRANSFER_AMOUNT     = "tb.transfer.amount"
	ATTR_TB_TRANSFER_COUNT      = "tb.transfer.count"
	ATTR_TB_DEBIT_ACCOUNT_ID    = "tb.debit_account.id"
	ATTR_TB_CREDIT_ACCOUNT_ID   = "tb.credit_account.id"
	ATTR_TB_PENDING_TRANSFER_ID = "tb.pending_transfer.id"

	ATTR_TB_FILTER_MIN_TIMESTAMP = "tb.filter.min_timestamp"
	ATTR_TB_FILTER_MAX_TIMESTAMP = "tb.filter.max_timestamp"
	ATTR_TB_FILTER_LIMIT         = "tb.filter.limit"
)

const (
	EVENT_TB_CREATE_ACCOUNT    = "tb.account.create"
	EVENT_TB_LOOKUP_ACCOUNT    = "tb.account.lookup"
	EVENT_TB_ACCOUNT_NOT_FOUND = "tb.account.not_found"
	EVENT_TB_ACCOUNT_EXISTS    = "tb.account.exists"

	EVENT_TB_CREATE_TRANSFER         = "tb.transfer.create"
	EVENT_TB_CREATE_PENDING_TRANSFER = "tb.transfer.pending.create"
	EVENT_TB_POST_PENDING_TRANSFER   = "tb.transfer.pending.post"
	EVENT_TB_VOID_PENDING_TRANSFER   = "tb.transfer.pending.void"
	EVENT_TB_LOOKUP_TRANSFER         = "tb.transfer.lookup"
	EVENT_TB_GET_TRANSFERS           = "tb.transfer.get_list"
	EVENT_TB_TRANSFER_NOT_FOUND      = "tb.transfer.not_found"
	EVENT_TB_NOT_ENOUGH_FUNDS        = "tb.transfer.not_enough_funds"

	EVENT_VALIDATION_FAILED = "validation.failed"
)
