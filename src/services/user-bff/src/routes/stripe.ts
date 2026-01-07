import { Hono } from "hono";
import { validator } from "hono-openapi";
import { except } from "hono/combine";
import { jwt } from "hono/jwt";

import { createUnexpectedError } from "@repo/validators/error";
import { generateStripeCheckoutRequestSchema } from "@repo/validators/stripe";

import type { JwtPayload } from "..";
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

export const stripeRouter = new Hono();

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
    const { sub: userId } = c.get("jwtPayload") as JwtPayload;
    const { amount } = c.req.valid("json");

    const { data: user, error: userError } = await userService.call(
      "getUserById",
      {
        userId,
      },
    );
    if (userError) {
      console.error("Failed to get user", userError.details, userError.message);
      return c.json(createUnexpectedError(), 500);
    }

    // THIS SHOULD NEVER HAPPEN
    if (!user.phoneNumber) {
      console.error(
        "Failed to create stripe checkout: user is missing phone number",
      );
      return c.json(createUnexpectedError(), 500);
    }

    const { data: stripeCustomerId, error: stripeCustomerError } =
      await getOrCreateStripeCustomer(user.phoneNumber, userId);
    if (stripeCustomerError) {
      return c.json(createUnexpectedError(), 500);
    }

    const { data: checkout, error: checkoutError } = await createStripeCheckout(
      stripeCustomerId,
      amount,
      userId,
    );
    if (checkoutError) {
      console.error(
        "Failed to create stripe checkout",
        checkoutError.message,
        checkoutError.stack,
      );
      return c.json(createUnexpectedError(), 500);
    }

    return c.json({ url: checkout.url });
  },
);

stripeRouter.post("/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.text("signature missing", 400);
  }
  const body = await c.req.text();
  const { data: event, error: eventError } = await stripeConstructWebhookEvent(
    body,
    signature,
  );
  if (eventError) {
    console.error("Failed to construct stripe webhook event");
    return c.text("bad event", 500);
  }

  console.log("[STRIPE] got event", event.type);

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
      console.info(
        "Stripe event triggered but no action was taken",
        event.type,
      );
      return c.text("no action taken", 200);
      break;
  }
});
