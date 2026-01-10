import type { Span } from "@opentelemetry/api";
import type { Context } from "hono";
import type Stripe from "stripe";

import type { Env } from "..";
import { stripeService } from "../services/stripeService";
import { attrs, events } from "../util/attr";
import { formatAsHex } from "../util/formatter";

function addEventInfoToSpan(span: Span, event: Stripe.TransferCreatedEvent) {
  const transfer = event.data.object;
  span.setAttributes({
    [attrs.ATTR_STRIPE_EVENT_ID]: event.id,
    [attrs.ATTR_STRIPE_EVENT_TIMESTAMP]: event.created,
    [attrs.ATTR_STRIPE_EVENT_TYPE]: event.type,

    [attrs.ATTR_STRIPE_TRANSFER_ID]: transfer.id,
    [attrs.ATTR_STRIPE_TRANSFER_AMOUNT]: transfer.amount,
    [attrs.ATTR_STRIPE_TRANSFER_CURRENCY]: transfer.currency,
  });

  if (typeof transfer.destination === "string") {
    span.setAttribute(
      attrs.ATTR_STRIPE_TRANSFER_DESTINATION,
      transfer.destination,
    );
  }
}

export async function handleCreated(
  event: Stripe.TransferCreatedEvent,
  c: Context<Env>,
) {
  const span = c.get("span");
  const transfer = event.data.object;

  addEventInfoToSpan(span, event);

  const { error: postPayoutError } = await stripeService.call(
    "postPendingPayout",
    {
      stripePayoutId: transfer.id,
      amount: formatAsHex(transfer.amount),
    },
  );

  if (postPayoutError) {
    span.recordException(postPayoutError);
    span.addEvent(events.EVENT_STRIPE_TRANSFER_POST_ERROR);
    return c.text("failed to post payout", 500);
  }

  span.addEvent(events.EVENT_STRIPE_TRANSFER_SUCCESS);
  return c.text("ok", 200);
}
