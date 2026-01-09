import { Hono } from "hono";
import { validator } from "hono-openapi";
import { except } from "hono/combine";
import { jwt } from "hono/jwt";

import { createUnexpectedError } from "@repo/validators/error";
import { generateStripeCheckoutRequestSchema } from "@repo/validators/stripe";

import type { Env } from "..";
import { env } from "../env";
import {
  handleCancelled,
  handleFailed,
  handleProcessing,
  handleSuccess,
} from "../events/paymentIntent";
import {
  createStripeCheckout,
  getOrCreateStripeCustomer,
  stripeConstructWebhookEvent,
} from "../services/stripe";
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
      await getOrCreateStripeCustomer(user.phoneNumber, userId);
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
      return handleSuccess(event, c);
    case "payment_intent.canceled":
      return handleCancelled(event, c);
    case "payment_intent.payment_failed":
      return handleFailed(event, c);
    case "payment_intent.processing":
      return handleProcessing(event, c);
    default:
      span.addEvent(events.EVENT_STRIPE_WEBHOOK_NO_ACTION);
      return c.text("no action taken", 200);
  }
});
