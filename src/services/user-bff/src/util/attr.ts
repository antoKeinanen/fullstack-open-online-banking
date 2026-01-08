export const attrs = {
  ATTR_USER_USER_AGENT: "user.user_agent",
  ATTR_USER_FORWARDED_FOR: "user.forwarded_for",
  ATTR_AUTH_OTP_ERROR_CAUSE: "user.cause",
  ATTR_USER_SESSION_ACCESS_TOKEN: "user.access_token",
  ATTR_USER_SESSION_ACCESS_TOKEN_EXPIRES: "user.access_token.expires",
  ATTR_USER_SESSION_REFRESH_TOKEN: "user.refresh_token",
  ATTR_USER_SESSION_REFRESH_TOKEN_EXPIRES: "user.refresh_token.expires",
  ATTR_USER_ID: "user.id",

  ATTR_PAYMENT_IDEMPOTENCY_KEY: "payment.idempotency_key",
  ATTR_PAYMENT_AMOUNT: "payment.amount",
  ATTR_PAYMENT_TO_USER_PHONE: "payment.to_user_phone",
  ATTR_PAYMENT_ID: "payment.id",
  ATTR_PAYMENT_FROM_USER_ID: "payment.from_user_id",
  ATTR_PAYMENT_TO_USER_ID: "payment.to_user_id",
  ATTR_PAYMENT_TRANSACTION_STATE: "payment.transaction_state",

  ATTR_STRIPE_CUSTOMER_ID: "stripe.customer_id",
  ATTR_STRIPE_PAYMENT_INTENT_ID: "stripe.payment_intent_id",
  ATTR_STRIPE_EVENT_TYPE: "stripe.event_type",
  ATTR_STRIPE_CHECKOUT_URL: "stripe.checkout_url",
  ATTR_STRIPE_CHECKOUT_AMOUNT: "stripe.checkout_amount",
  ATTR_STRIPE_TIGERBEETLE_TRANSFER_ID: "stripe.tigerbeetle_transfer_id",
  ATTR_STRIPE_CANCELLATION_REASON: "stripe.cancellation_reason",
  ATTR_STRIPE_PAYMENT_ERROR: "stripe.payment_error",
  ATTR_STRIPE_EVENT_ID: "stripe.event_id",
  ATTR_STRIPE_EVENT_TIMESTAMP: "stripe.event_timestamp",
  ATTR_STRIPE_PAYMENT_INTENT_AMOUNT: "stripe.payment_intent_amount",
  ATTR_STRIPE_PAYMENT_INTENT_CURRENCY: "stripe.payment_intent_currency",
  ATTR_STRIPE_PAYMENT_INTENT_STATUS: "stripe.payment_intent_status",
  ATTR_STRIPE_USER_ID: "stripe.user_id",
  ATTR_STRIPE_PAYMENT_METHOD: "stripe.payment_method",
  ATTR_STRIPE_FAILURE_CODE: "stripe.failure_code",
  ATTR_STRIPE_FAILURE_MESSAGE: "stripe.failure_message",
  ATTR_STRIPE_FAILURE_REASON: "stripe.failure_reason",
  ATTR_STRIPE_CANCELLATION_CODE: "stripe.cancellation_code",
  ATTR_STRIPE_CANCELLED_AT: "stripe.cancelled_at",
};

export const events = {
  EVENT_USER_NOT_FOUND: "user.not_found",
  EVENT_USER_NO_USER_AGENT: "user.no_user_agent_header",
  EVENT_USER_NO_FORWARDED_FOR: "user.no_forwarded_for_header",
  EVENT_USER_MALFORMED_FORWARDED_FOR: "user.malformed_forwarded_for_header",
  EVENT_AUTH_OTP_MISMATCH: "auth.otp.mismatch",
  EVENT_NULLITY_CHECK_FAILURE: "error.null_check",
  EVENT_COOKIE_SET: "cookie.set",
  EVENT_REFRESH_TOKEN_NULL_CHECK_FAILURE:
    "auth.refresh_token.null_check_failure",
  EVENT_SIGN_UP_CONFLICT: "auth.sign_up.conflict",
  EVENT_SIGN_UP_FAILURE: "auth.sign_up.failure",
  EVENT_GET_SESSIONS_FAILURE: "auth.sessions.get_failure",
  EVENT_INVALIDATE_SESSION_FAILURE: "auth.sessions.invalidate_failure",
  EVENT_LOGOUT: "auth.logout",

  EVENT_USER_GET_FAILURE: "user.get_failure",
  EVENT_USER_TRANSFERS_GET_FAILURE: "user.transfers.get_failure",

  EVENT_PAYMENT_TRANSFER_DUPLICATE_PENDING:
    "payment.transfer.duplicate_pending",
  EVENT_PAYMENT_TRANSFER_DUPLICATE_FAILED: "payment.transfer.duplicate_failed",
  EVENT_PAYMENT_TRANSFER_DUPLICATE_SUCCESS:
    "payment.transfer.duplicate_success",
  EVENT_PAYMENT_TRANSFER_RECIPIENT_NOT_FOUND:
    "payment.transfer.recipient_not_found",
  EVENT_PAYMENT_TRANSFER_RECIPIENT_LOOKUP_FAILURE:
    "payment.transfer.recipient_lookup_failure",
  EVENT_PAYMENT_TRANSFER_SELF_TRANSFER: "payment.transfer.self_transfer",
  EVENT_PAYMENT_TRANSFER_INSUFFICIENT_FUNDS:
    "payment.transfer.insufficient_funds",
  EVENT_PAYMENT_TRANSFER_SUCCESS: "payment.transfer.success",
  EVENT_PAYMENT_TRANSFER_FAILURE: "payment.transfer.failure",

  EVENT_STRIPE_CHECKOUT_GET_USER_FAILURE: "stripe.checkout.get_user_failure",
  EVENT_STRIPE_CHECKOUT_MISSING_PHONE: "stripe.checkout.missing_phone",
  EVENT_STRIPE_CHECKOUT_CUSTOMER_ERROR: "stripe.checkout.customer_error",
  EVENT_STRIPE_CHECKOUT_CREATE_ERROR: "stripe.checkout.create_error",
  EVENT_STRIPE_CHECKOUT_SUCCESS: "stripe.checkout.success",

  EVENT_STRIPE_WEBHOOK_MISSING_SIGNATURE: "stripe.webhook.missing_signature",
  EVENT_STRIPE_WEBHOOK_EVENT_ERROR: "stripe.webhook.event_error",
  EVENT_STRIPE_WEBHOOK_RECEIVED: "stripe.webhook.received",
  EVENT_STRIPE_WEBHOOK_NO_ACTION: "stripe.webhook.no_action",

  EVENT_STRIPE_INTENT_MISSING_CUSTOMER: "stripe.intent.missing_customer",
  EVENT_STRIPE_INTENT_PENDING_TRANSFER_ERROR:
    "stripe.intent.pending_transfer_error",
  EVENT_STRIPE_INTENT_USER_LOOKUP_ERROR: "stripe.intent.user_lookup_error",
  EVENT_STRIPE_INTENT_POST_TRANSFER_ERROR: "stripe.intent.post_transfer_error",
  EVENT_STRIPE_INTENT_CREATE_POST_TRANSFER_ERROR:
    "stripe.intent.create_post_transfer_error",
  EVENT_STRIPE_INTENT_SUCCESS: "stripe.intent.success",
  EVENT_STRIPE_INTENT_REPLAYED: "stripe.intent.replayed",
  EVENT_STRIPE_INTENT_CREATE_PENDING_ERROR:
    "stripe.intent.create_pending_error",
  EVENT_STRIPE_INTENT_TRANSFER_NOT_FOUND: "stripe.intent.transfer_not_found",
  EVENT_STRIPE_INTENT_VOID_TRANSFER_ERROR: "stripe.intent.void_transfer_error",
  EVENT_STRIPE_INTENT_CANCELLED: "stripe.intent.cancelled",
  EVENT_STRIPE_INTENT_FAILED: "stripe.intent.failed",
};
