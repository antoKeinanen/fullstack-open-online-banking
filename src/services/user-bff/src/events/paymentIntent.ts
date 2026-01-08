import type { Span } from "@opentelemetry/api";
import type { Context } from "hono";
import type Stripe from "stripe";

import type { Env } from "..";
import { stripeService } from "../services/stripe";
import { attrs, events } from "../util/attr";
import { formatAsHex } from "../util/formatter";
import { getStripeCustomerId } from "../util/stripe";

function addEventInfoToSpan(
  span: Span,
  event:
    | Stripe.PaymentIntentSucceededEvent
    | Stripe.PaymentIntentProcessingEvent
    | Stripe.PaymentIntentCanceledEvent
    | Stripe.PaymentIntentPaymentFailedEvent,
) {
  const paymentIntent = event.data.object;
  span.setAttributes({
    [attrs.ATTR_STRIPE_EVENT_ID]: event.id,
    [attrs.ATTR_STRIPE_EVENT_TIMESTAMP]: event.created,
    [attrs.ATTR_STRIPE_EVENT_TYPE]: event.type,

    [attrs.ATTR_STRIPE_PAYMENT_INTENT_ID]: paymentIntent.id,
    [attrs.ATTR_STRIPE_PAYMENT_INTENT_AMOUNT]: paymentIntent.amount,
    [attrs.ATTR_STRIPE_PAYMENT_INTENT_CURRENCY]: paymentIntent.currency,
    [attrs.ATTR_STRIPE_PAYMENT_INTENT_STATUS]: paymentIntent.status,
  });

  if (event.type == "payment_intent.payment_failed") {
    const lastPaymentError = paymentIntent.last_payment_error;
    if (lastPaymentError) {
      span.setAttributes({
        [attrs.ATTR_STRIPE_FAILURE_CODE]: lastPaymentError.code,
        [attrs.ATTR_STRIPE_FAILURE_MESSAGE]: lastPaymentError.message,
        [attrs.ATTR_STRIPE_FAILURE_REASON]: lastPaymentError.type,
      });
    }
  }

  if (event.type == "payment_intent.canceled") {
    const cancellationReason = paymentIntent.cancellation_reason;
    if (cancellationReason) {
      span.setAttribute(
        attrs.ATTR_STRIPE_CANCELLATION_REASON,
        cancellationReason,
      );
    }

    if (paymentIntent.canceled_at) {
      span.setAttribute(
        attrs.ATTR_STRIPE_CANCELLED_AT,
        paymentIntent.canceled_at,
      );
    }
  }
}

export async function handleSuccess(
  event: Stripe.PaymentIntentSucceededEvent,
  c: Context<Env>,
) {
  const span = c.get("span");
  const paymentIntent = event.data.object;

  addEventInfoToSpan(span, event);

  if (!paymentIntent.customer) {
    span.addEvent(events.EVENT_STRIPE_INTENT_MISSING_CUSTOMER);
    return c.text("no customer", 500);
  }

  const { data: pendingTransfer, error: pendingTransferError } =
    await stripeService.call("getPendingTransfer", {
      stripePaymentIntentId: paymentIntent.id,
    });
  if (pendingTransferError) {
    span.recordException(pendingTransferError);
    span.addEvent(events.EVENT_STRIPE_INTENT_PENDING_TRANSFER_ERROR);
    return c.text("failed to get pending transfer", 500);
  }

  const stripeCustomerId = getStripeCustomerId(paymentIntent.customer);
  span.setAttribute(attrs.ATTR_STRIPE_CUSTOMER_ID, stripeCustomerId);

  const { data: user, error: userError } = await stripeService.call(
    "getUserId",
    {
      stripeCustomerId: stripeCustomerId,
    },
  );
  if (userError) {
    span.recordException(userError);
    span.addEvent(events.EVENT_STRIPE_INTENT_USER_LOOKUP_ERROR);
    return c.text("failed to get user id", 500);
  }

  if (user.userId) {
    span.setAttribute(attrs.ATTR_USER_ID, user.userId);
  }

  if (pendingTransfer.tigerbeetleTransferId) {
    span.setAttribute(
      attrs.ATTR_STRIPE_TIGERBEETLE_TRANSFER_ID,
      pendingTransfer.tigerbeetleTransferId,
    );

    const { error: postError } = await stripeService.call(
      "postPendingTransfer",
      {
        tigerbeetleTransferId: pendingTransfer.tigerbeetleTransferId,
        userId: user.userId,
        amount: formatAsHex(paymentIntent.amount),
      },
    );
    if (postError) {
      span.recordException(postError);
      span.addEvent(events.EVENT_STRIPE_INTENT_POST_TRANSFER_ERROR);
      return c.text("failed to post pending transfer", 500);
    }
    span.addEvent(events.EVENT_STRIPE_INTENT_SUCCESS);
    return c.text("ok", 200);
  }

  const { error: createAndPostError } = await stripeService.call(
    "createAndPostTransfer",
    {
      stripeCustomerId: stripeCustomerId,
      stripePaymentIntentId: paymentIntent.id,
      userId: user.userId,
      amount: formatAsHex(paymentIntent.amount),
    },
  );
  if (createAndPostError) {
    span.recordException(createAndPostError);
    span.addEvent(events.EVENT_STRIPE_INTENT_CREATE_POST_TRANSFER_ERROR);
    return c.text("failed to create and post transfer", 500);
  }

  span.addEvent(events.EVENT_STRIPE_INTENT_SUCCESS);
  return c.text("ok", 200);
}

export async function handleProcessing(
  event: Stripe.PaymentIntentProcessingEvent,
  c: Context<Env>,
) {
  const span = c.get("span");
  const paymentIntent = event.data.object;

  addEventInfoToSpan(span, event);

  if (!paymentIntent.customer) {
    span.addEvent(events.EVENT_STRIPE_INTENT_MISSING_CUSTOMER);
    return c.text("", 500);
  }

  const { data: pendingTransfer, error: pendingTransferError } =
    await stripeService.call("getPendingTransfer", {
      stripePaymentIntentId: paymentIntent.id,
    });
  if (pendingTransferError) {
    span.recordException(pendingTransferError);
    span.addEvent(events.EVENT_STRIPE_INTENT_PENDING_TRANSFER_ERROR);
    return c.text("failed to get pending transfer", 500);
  }

  if (pendingTransfer.tigerbeetleTransferId) {
    span.setAttribute(
      attrs.ATTR_STRIPE_TIGERBEETLE_TRANSFER_ID,
      pendingTransfer.tigerbeetleTransferId,
    );
    span.addEvent(events.EVENT_STRIPE_INTENT_REPLAYED);
    return c.text("replayed", 200);
  }

  const stripeCustomerId = getStripeCustomerId(paymentIntent.customer);
  span.setAttribute(attrs.ATTR_STRIPE_CUSTOMER_ID, stripeCustomerId);

  const { data: user, error: userError } = await stripeService.call(
    "getUserId",
    {
      stripeCustomerId: stripeCustomerId,
    },
  );
  if (userError) {
    span.recordException(userError);
    span.addEvent(events.EVENT_STRIPE_INTENT_USER_LOOKUP_ERROR);
    return c.text("failed to get user id", 500);
  }

  if (user.userId) {
    span.setAttribute(attrs.ATTR_USER_ID, user.userId);
  }

  const { error: newPendingTransferError } = await stripeService.call(
    "createPendingTransfer",
    {
      stripeCustomerId: stripeCustomerId,
      stripePaymentIntentId: paymentIntent.id,
      userId: user.userId,
      amount: formatAsHex(paymentIntent.amount),
    },
  );
  if (newPendingTransferError) {
    span.recordException(newPendingTransferError);
    span.addEvent(events.EVENT_STRIPE_INTENT_CREATE_PENDING_ERROR);
    return c.text("failed to create pending transfer", 500);
  }

  span.addEvent(events.EVENT_STRIPE_INTENT_SUCCESS);
  return c.text("ok", 200);
}

async function voidPendingTransfer(
  paymentIntent: Stripe.PaymentIntent,
  c: Context<Env>,
) {
  const span = c.get("span");

  if (!paymentIntent.customer) {
    span.addEvent(events.EVENT_STRIPE_INTENT_MISSING_CUSTOMER);
    return c.text("", 500);
  }

  const { data: pendingTransfer, error: pendingTransferError } =
    await stripeService.call("getPendingTransfer", {
      stripePaymentIntentId: paymentIntent.id,
    });
  if (pendingTransferError) {
    span.recordException(pendingTransferError);
    span.addEvent(events.EVENT_STRIPE_INTENT_PENDING_TRANSFER_ERROR);
    return c.text("failed to get pending transfer", 500);
  }

  if (!pendingTransfer.tigerbeetleTransferId) {
    span.addEvent(events.EVENT_STRIPE_INTENT_TRANSFER_NOT_FOUND);
    return c.text("transfer not found", 500);
  }

  span.setAttribute(
    attrs.ATTR_STRIPE_TIGERBEETLE_TRANSFER_ID,
    pendingTransfer.tigerbeetleTransferId,
  );

  const stripeCustomerId = getStripeCustomerId(paymentIntent.customer);
  span.setAttribute(attrs.ATTR_STRIPE_CUSTOMER_ID, stripeCustomerId);

  const { data: user, error: userError } = await stripeService.call(
    "getUserId",
    {
      stripeCustomerId: stripeCustomerId,
    },
  );
  if (userError) {
    span.recordException(userError);
    span.addEvent(events.EVENT_STRIPE_INTENT_USER_LOOKUP_ERROR);
    return c.text("failed to get user id", 500);
  }

  if (user.userId) {
    span.setAttribute(attrs.ATTR_USER_ID, user.userId);
  }

  const { error: newPendingTransferError } = await stripeService.call(
    "voidPendingTransfer",
    {
      tigerbeetleTransferId: pendingTransfer.tigerbeetleTransferId,
      userId: user.userId,
      amount: formatAsHex(paymentIntent.amount),
    },
  );
  if (newPendingTransferError) {
    span.recordException(newPendingTransferError);
    span.addEvent(events.EVENT_STRIPE_INTENT_VOID_TRANSFER_ERROR);
    return c.text("failed to create pending transfer", 500);
  }

  return c.text("ok", 200);
}

export function handleCancelled(
  event: Stripe.PaymentIntentCanceledEvent,
  c: Context<Env>,
) {
  const span = c.get("span");

  addEventInfoToSpan(span, event);
  span.addEvent(events.EVENT_STRIPE_INTENT_CANCELLED);

  return voidPendingTransfer(event.data.object, c);
}

export function handleFailed(
  event: Stripe.PaymentIntentPaymentFailedEvent,
  c: Context<Env>,
) {
  const span = c.get("span");

  addEventInfoToSpan(span, event);
  span.addEvent(events.EVENT_STRIPE_INTENT_FAILED);

  return voidPendingTransfer(event.data.object, c);
}
