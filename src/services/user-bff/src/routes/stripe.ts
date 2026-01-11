import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { except } from "hono/combine";
import { jwt } from "hono/jwt";

import {
  apiErrorResponseSchema,
  createSingleError,
  createUnexpectedError,
} from "@repo/validators/error";
import {
  createStripePayoutSchema,
  generateStripeCheckoutRequestSchema,
} from "@repo/validators/stripe";

import type { Env } from "..";
import { env } from "../env";
import * as paymentIntent from "../events/paymentIntent";
import * as transfer from "../events/transfer";
import {
  cacheTransaction,
  getTransaction,
  updateTransactionState,
} from "../services/idempotencyService";
import {
  checkPayoutEligibility,
  createPayout,
  createStripeCheckout,
  getOrCreateStripeAccount,
  getOrCreateStripeCustomer,
  stripeConstructWebhookEvent,
} from "../services/stripeService";
import { userService } from "../services/userService";
import { attrs, events } from "../util/attr";

export const stripeRouter = new Hono<Env>();

stripeRouter.use(
  "*",
  except(
    "/api/stripe/webhook",
    jwt({ secret: env.USER_BFF_JWT_SECRET, alg: env.USER_BFF_JWT_ALG }),
  ),
);

stripeRouter.post(
  "/generate-stripe-checkout",
  validator("json", generateStripeCheckoutRequestSchema),

  async (c) => {
    const span = c.get("span");
    const { sub: userId } = c.get("jwtPayload");
    const { amount } = c.req.valid("json");

    span.setAttributes({
      [attrs.ATTR_USER_ID]: userId,
      [attrs.ATTR_STRIPE_CHECKOUT_AMOUNT]: amount,
    });

    const { data: user, error: userError } = await userService.call(
      "getUserById",
      {
        userId,
      },
    );
    if (userError) {
      span.recordException(userError);
      span.addEvent(events.EVENT_STRIPE_CHECKOUT_GET_USER_FAILURE);
      return c.json(createUnexpectedError(), 500);
    }

    // THIS SHOULD NEVER HAPPEN
    if (!user.phoneNumber) {
      span.addEvent(events.EVENT_STRIPE_CHECKOUT_MISSING_PHONE);
      return c.json(createUnexpectedError(), 500);
    }

    const { data: stripeCustomerId, error: stripeCustomerError } =
      await getOrCreateStripeCustomer(span, user.phoneNumber, userId);
    if (stripeCustomerError) {
      span.recordException(stripeCustomerError);
      span.addEvent(events.EVENT_STRIPE_CHECKOUT_CUSTOMER_ERROR);
      return c.json(createUnexpectedError(), 500);
    }

    span.setAttribute(attrs.ATTR_STRIPE_CUSTOMER_ID, stripeCustomerId);

    const { data: checkout, error: checkoutError } = await createStripeCheckout(
      stripeCustomerId,
      amount,
      userId,
    );
    if (checkoutError) {
      span.recordException(checkoutError);
      span.addEvent(events.EVENT_STRIPE_CHECKOUT_CREATE_ERROR);
      return c.json(createUnexpectedError(), 500);
    }

    span.setAttribute(attrs.ATTR_STRIPE_CHECKOUT_URL, checkout.url ?? "");
    span.addEvent(events.EVENT_STRIPE_CHECKOUT_SUCCESS);

    return c.json({ url: checkout.url });
  },
);

stripeRouter.post(
  "/payouts",
  describeRoute({
    description: "Create a payout to the user's connected Stripe account",
    responses: {
      200: {
        description: "A successful response",
        content: {
          "text/plain": {
            example: "Success",
          },
        },
      },
      401: {
        description: "Missing or expired access token",
      },
      422: {
        description:
          "An error has occurred. Refer to the response error object",
        content: {
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
      500: {
        description:
          "An error has occurred. Refer to the response error object",
        content: {
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
    },
  }),

  validator("json", createStripePayoutSchema),

  async (c) => {
    const span = c.get("span");
    const { sub: userId } = c.get("jwtPayload");
    const { amount, idempotencyKey } = c.req.valid("json");

    span.setAttributes({
      [attrs.ATTR_USER_ID]: userId,
      [attrs.ATTR_PAYOUT_IDEMPOTENCY_KEY]: idempotencyKey,
      [attrs.ATTR_PAYOUT_AMOUNT]: amount,
    });

    const transaction = await getTransaction(userId, idempotencyKey);
    if (transaction) {
      span.setAttribute(attrs.ATTR_PAYOUT_TRANSACTION_STATE, transaction.state);
      switch (transaction.state) {
        case "pending":
          span.addEvent(events.EVENT_PAYOUT_DUPLICATE_PENDING);
          return c.json(
            createSingleError(
              "IDEMPOTENCY_ERROR",
              "The server is already processing this payout",
            ),
            500,
          );
        case "failed":
          span.addEvent(events.EVENT_PAYOUT_DUPLICATE_FAILED);
          return c.json(
            createSingleError(
              "IDEMPOTENCY_ERROR",
              "Payout has already failed. If this was a mistake please create a new one.",
            ),
            500,
          );
        case "success":
          span.addEvent(events.EVENT_PAYOUT_DUPLICATE_SUCCESS);
          return c.text("Success", 200);
        default: {
          const _exhaustive: never = transaction.state;
          break;
        }
      }
    }

    const payoutId = crypto.randomUUID().replaceAll("-", "");
    span.setAttribute(attrs.ATTR_PAYOUT_ID, payoutId);
    await cacheTransaction(userId, idempotencyKey, payoutId, "pending");

    const { error } = await createPayout(span, userId, amount);

    if (error) {
      span.recordException(error);
      await updateTransactionState(userId, idempotencyKey, "failed");

      if (error.message.includes("Missing stripe account")) {
        span.addEvent(events.EVENT_PAYOUT_MISSING_STRIPE_ACCOUNT);
        return c.json(
          createSingleError(
            "ACTION_FAILED",
            "Please complete Stripe onboarding on before creating a payout",
          ),
          422,
        );
      }

      if ("details" in error && error.details === "NOT_ENOUGH_FUNDS") {
        span.addEvent(events.EVENT_PAYOUT_INSUFFICIENT_FUNDS);
        return c.json(
          createSingleError("NOT_ENOUGH_FUNDS", "Insufficient balance"),
          422,
        );
      }

      span.addEvent(events.EVENT_PAYOUT_FAILURE);
      return c.json(createUnexpectedError(), 500);
    }

    await updateTransactionState(userId, idempotencyKey, "success");
    span.addEvent(events.EVENT_PAYOUT_SUCCESS);

    return c.text("Success", 200);
  },
);

stripeRouter.get("/payout-eligibility", async (c) => {
  const span = c.get("span");
  const { sub: userId } = c.get("jwtPayload");

  span.setAttribute(attrs.ATTR_USER_ID, userId);

  const { data, error } = await checkPayoutEligibility(span, userId);
  if (error) {
    span.recordException(error);
    return c.json(createUnexpectedError(), 500);
  }

  return c.json(data);
});

stripeRouter.get("/onboard-url", async (c) => {
  const span = c.get("span");
  const { sub: userId } = c.get("jwtPayload");

  const { data, error } = await getOrCreateStripeAccount(span, userId);
  if (error) {
    span.recordException(error);
    return c.json(createUnexpectedError(), 500);
  }

  return c.json({ url: data.url });
});

stripeRouter.post("/webhook", async (c) => {
  const span = c.get("span");
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    span.addEvent(events.EVENT_STRIPE_WEBHOOK_MISSING_SIGNATURE);
    return c.text("signature missing", 400);
  }
  const body = await c.req.text();
  const { data: event, error: eventError } = await stripeConstructWebhookEvent(
    body,
    signature,
  );
  if (eventError) {
    span.recordException(eventError);
    span.addEvent(events.EVENT_STRIPE_WEBHOOK_EVENT_ERROR);
    return c.text("bad event", 500);
  }

  span.addEvent(events.EVENT_STRIPE_WEBHOOK_RECEIVED);

  switch (event.type) {
    case "payment_intent.succeeded":
      return paymentIntent.handleSuccess(event, c);
    case "payment_intent.canceled":
      return paymentIntent.handleCancelled(event, c);
    case "payment_intent.payment_failed":
      return paymentIntent.handleFailed(event, c);
    case "payment_intent.processing":
      return paymentIntent.handleProcessing(event, c);
    case "transfer.created":
      return transfer.handleCreated(event, c);
    default:
      span.addEvent(events.EVENT_STRIPE_WEBHOOK_NO_ACTION);
      return c.text("no action taken", 200);
  }
});
