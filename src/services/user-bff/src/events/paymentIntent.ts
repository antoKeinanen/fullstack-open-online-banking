import type { Context } from "hono";
import type Stripe from "stripe";

import { stripeService } from "../services/stripe";
import { formatAsHex } from "../util/formatter";
import { getStripeCustomerId } from "../util/stripe";

export async function handleSuccess(
  event: Stripe.PaymentIntentSucceededEvent,
  c: Context,
) {
  const paymentIntent = event.data.object;
  if (!paymentIntent.customer) {
    console.error("Could not handle success event: missing customer");
    return c.text("no customer", 500);
  }

  const { data: pendingTransfer, error: pendingTransferError } =
    await stripeService.call("getPendingTransfer", {
      stripePaymentIntentId: paymentIntent.id,
    });
  if (pendingTransferError) {
    console.error(
      "Failed to get pending transfer",
      pendingTransferError.message,
      pendingTransferError.details,
      pendingTransferError.stack,
    );
    return c.text("failed to get pending transfer", 500);
  }

  const stripeCustomerId = getStripeCustomerId(paymentIntent.customer);
  const { data: user, error: userError } = await stripeService.call(
    "getUserId",
    {
      stripeCustomerId: stripeCustomerId,
    },
  );
  if (userError) {
    console.error(
      "Failed to get user id by stripe customer id",
      userError.message,
      userError.details,
      userError.stack,
    );
    return c.text("failed to get user id", 500);
  }

  if (pendingTransfer.tigerbeetleTransferId) {
    const { error: postError } = await stripeService.call(
      "postPendingTransfer",
      {
        tigerbeetleTransferId: pendingTransfer.tigerbeetleTransferId,
        userId: user.userId,
        amount: formatAsHex(paymentIntent.amount),
      },
    );
    if (postError) {
      console.error(
        "Failed to post pending transfer",
        postError.message,
        postError.details,
        postError.stack,
      );
      return c.text("failed to post pending transfer", 500);
    }
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
    console.error(
      "Failed to create and post transfer",
      createAndPostError.message,
      createAndPostError.details,
      createAndPostError.stack,
    );
    return c.text("failed to create and post transfer", 500);
  }

  return c.text("ok", 200);
}

export async function handleProcessing(
  event: Stripe.PaymentIntentProcessingEvent,
  c: Context,
) {
  const paymentIntent = event.data.object;

  if (!paymentIntent.customer) {
    console.error("Could not process payment: Missing customer");
    return c.text("", 500);
  }

  const { data: pendingTransfer, error: pendingTransferError } =
    await stripeService.call("getPendingTransfer", {
      stripePaymentIntentId: paymentIntent.id,
    });
  if (pendingTransferError) {
    console.error(
      "Failed to get pending transfer",
      pendingTransferError.message,
      pendingTransferError.details,
      pendingTransferError.stack,
    );
    return c.text("failed to get pending transfer", 500);
  }

  if (pendingTransfer.tigerbeetleTransferId) {
    return c.text("replayed", 200);
  }

  const stripeCustomerId = getStripeCustomerId(paymentIntent.customer);
  const { data: user, error: userError } = await stripeService.call(
    "getUserId",
    {
      stripeCustomerId: stripeCustomerId,
    },
  );
  if (userError) {
    console.error(
      "Failed to get user id by stripe customer id",
      userError.message,
      userError.details,
      userError.stack,
    );
    return c.text("failed to get user id", 500);
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
    console.error(
      "Failed to create pending transfer",
      newPendingTransferError.message,
      newPendingTransferError.details,
      newPendingTransferError.stack,
    );
    return c.text("failed to create pending transfer", 500);
  }

  return c.text("ok", 200);
}

async function voidPendingTransfer(
  paymentIntent: Stripe.PaymentIntent,
  c: Context,
) {
  if (!paymentIntent.customer) {
    console.error("Could not process payment cancellation: Missing customer");
    return c.text("", 500);
  }

  const { data: pendingTransfer, error: pendingTransferError } =
    await stripeService.call("getPendingTransfer", {
      stripePaymentIntentId: paymentIntent.id,
    });
  if (pendingTransferError) {
    console.error(
      "Failed to get pending transfer",
      pendingTransferError.message,
      pendingTransferError.details,
      pendingTransferError.stack,
    );
    return c.text("failed to get pending transfer", 500);
  }

  if (!pendingTransfer.tigerbeetleTransferId) {
    return c.text("transfer not found", 500);
  }

  const stripeCustomerId = getStripeCustomerId(paymentIntent.customer);
  const { data: user, error: userError } = await stripeService.call(
    "getUserId",
    {
      stripeCustomerId: stripeCustomerId,
    },
  );
  if (userError) {
    console.error(
      "Failed to get user id by stripe customer id",
      userError.message,
      userError.details,
      userError.stack,
    );
    return c.text("failed to get user id", 500);
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
    console.error(
      "Failed to create pending transfer",
      newPendingTransferError.message,
      newPendingTransferError.details,
      newPendingTransferError.stack,
    );
    return c.text("failed to create pending transfer", 500);
  }

  return c.text("ok", 200);
}

export function handleCancelled(
  event: Stripe.PaymentIntentCanceledEvent,
  c: Context,
) {
  console.error(
    "Cancelled payment event triggered",
    event.data.object.cancellation_reason,
  );
  return voidPendingTransfer(event.data.object, c);
}

export function handleFailed(
  event: Stripe.PaymentIntentPaymentFailedEvent,
  c: Context,
) {
  console.error(
    "Payment failed event triggered",
    event.data.object.last_payment_error?.message,
  );
  return voidPendingTransfer(event.data.object, c);
}
