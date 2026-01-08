package lib

const (
	ATTR_DB_QUERY         = "db.query"
	ATTR_DB_ARGS          = "db.args"
	ATTR_DB_ROWS_AFFECTED = "db.rows_affected"

	ATTR_USER_ID      = "user.id"
	ATTR_PHONE_NUMBER = "user.phone_number"
	ATTR_BIRTH_DATE   = "user.birth_date"

	ATTR_TB_ACCOUNT_ID     = "tigerbeetle.account_id"
	ATTR_TB_TRANSFER_COUNT = "tigerbeetle.transfer_count"

	ATTR_SESSION_ID    = "auth.session.id"
	ATTR_REFRESH_TOKEN = "auth.session.refresh_token"
)

const (
	EVENT_OTP_HASH          = "auth.otp.hash"
	EVENT_OTP_STORE         = "auth.otp.store"
	EVENT_OTP_GET           = "auth.otp.get"
	EVENT_OTP_VERIFY        = "auth.otp.verify"
	EVENT_OTP_HASH_MISMATCH = "auth.otp.hash_mismatch"

	EVENT_GENERATE_TOKEN_PAIR = "auth.token_pair.generate"
	EVENT_DECODE_TOKEN        = "auth.token.decode"
	EVENT_TOKEN_EXPIRED       = "auth.token.expired"

	EVENT_SESSION_STORE = "auth.session.store"
	EVENT_SESSION_GET   = "auth.session.get"

	EVENT_DB_NO_ROWS_AFFECTED            = "db.no_rows_affected"
	EVENT_DB_UNIQUE_CONSTRAINT_VIOLATION = "db.unique_constraint_violation"

	EVENT_USER_PARSE_BIRTH_DATE = "user.parse_birth_date"
	EVENT_USER_VALIDATE_AGE     = "user.validate_age"
	EVENT_DB_CREATE_USER        = "user.db.create"
	EVENT_DB_GET_USER           = "user.db.get"
	EVENT_MAP_USER_IDS          = "user.map_ids_to_names"
	EVENT_USER_UNDERAGE         = "user.underage"
	EVENT_USER_NOT_FOUND        = "user.not_found"

	EVENT_TB_CREATE_ACCOUNT = "tigerbeetle.create_account"
	EVENT_TB_LOOKUP_ACCOUNT = "tigerbeetle.lookup_account"
	EVENT_TB_GET_TRANSFERS  = "tigerbeetle.get_transfers"

	EVENT_ACCOUNT_NOT_FOUND = "tigerbeetle.account_not_found"
)
