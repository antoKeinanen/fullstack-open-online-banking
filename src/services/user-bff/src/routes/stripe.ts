import { Hono } from "hono";
import { validator } from "hono-openapi";
import { except } from "hono/combine";
import { jwt } from "hono/jwt";

import { createUnexpectedError } from "@repo/validators/error";
import { generateStripeCheckoutRequestSchema } from "@repo/validators/stripe";

import type { JwtPayload } from "..";
import { env } from "../env";
import { stripe, stripeService } from "../services/stripe";
import { userService } from "../services/userService";
import { formatAsHex } from "../util/formatter";
import { tryCatch } from "../util/tryCatch";

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
    const { data: stripeCustomer, error: getStripeCustomerIdError } =
      await stripeService.getStripeCustomerId({ userId });
    if (getStripeCustomerIdError) {
      console.error(
        "Failed to get stripe customer id",
        getStripeCustomerIdError.details,
        getStripeCustomerIdError.message,
      );
      return c.json(createUnexpectedError(), 500);
    }

    let stripeCustomerId = stripeCustomer.stripeCustomerId;
    if (!stripeCustomerId) {
      const { data: user, error: userError } = await userService.getUserById({
        userId,
      });
      if (userError) {
        console.error(
          "Failed to get user",
          userError.details,
          userError.message,
        );
        return c.json(createUnexpectedError(), 500);
      }

      const newCustomer = await stripe.customers.create({
        phone: user.phoneNumber,
      });

      const { error: setStripeCustomerIdError } =
        await stripeService.setStripeCustomerId({
          userId,
          stripeCustomerId: newCustomer.id,
        });

      if (setStripeCustomerIdError) {
        console.error(
          "Failed to get stripe customer id",
          setStripeCustomerIdError.details,
          setStripeCustomerIdError.message,
        );
        return c.json(createUnexpectedError(), 500);
      }

      stripeCustomerId = newCustomer.id;
    }

    const amountInCents = amount * 100;

    const checkout = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      success_url: env.USER_BFF_STRIPE_SUCCESS_ENDPOINT,
      ui_mode: "hosted",
      phone_number_collection: {
        enabled: true,
      },
      billing_address_collection: "auto",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: amountInCents,
            product_data: {
              name: `${amount}€ deposit`,
              description: `Add ${amount}€ to your account`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        amount: amount.toString(),
        userId,
      },
      payment_method_types: ["sepa_debit", "mobilepay", "card"],
    });

    return c.json({ url: checkout.url });
  },
);

stripeRouter.post("/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.text("", 400);
  }
  const body = await c.req.text();
  const { data: event, error: eventError } = await tryCatch(
    stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.USER_BFF_STRIPE_WEBHOOK_SECRET,
    ),
  );
  if (eventError) {
    console.error(
      "Failed to parse stripe event from request body",
      eventError.message,
    );
    return c.text("", 400);
  }

  console.log("[STRIPE] got event", event.type);

  if (event.type == "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    if (!paymentIntent.customer) {
      console.error("Could no process payment. Missing customer");
      return c.text("", 500);
    }

    let stripeCustomerId = null;
    if (typeof paymentIntent.customer === "string") {
      stripeCustomerId = paymentIntent.customer;
    } else {
      stripeCustomerId = paymentIntent.customer.id;
    }

    const { data: pending, error: pendingError } =
      await stripeService.getPendingTransfer({
        stripePaymentIntentId: paymentIntent.id,
      });
    if (pendingError) {
      console.error(
        "Failed to get pending transfer",
        pendingError.details,
        pendingError.message,
      );
      return c.text("", 500);
    }

    if (pending.tigerbeetleTransferId) {
      const { error: transferError } = await stripeService.postPendingTransfer({
        amount: formatAsHex(paymentIntent.amount),
        tigerbeetleTransferId: pending.tigerbeetleTransferId,
        userId: pending.userId,
      });
      if (transferError) {
        console.error(
          "Failed to post pending transfer",
          transferError.message,
          transferError.details,
        );
        return c.text("", 500);
      }
      return c.text("", 200);
    }

    const { data: user, error: userError } = await stripeService.getUserId({
      stripeCustomerId,
    });
    if (userError) {
      console.error("Failed to get user", userError.details, userError.message);
      return c.text("", 500);
    }

    const { error: transferError } = await stripeService.createAndPostTransfer({
      amount: formatAsHex(paymentIntent.amount),
      userId: user.userId,
      stripeCustomerId: stripeCustomerId,
      stripePaymentIntentId: paymentIntent.id,
    });
    if (transferError) {
      console.error(
        "Failed to post pending transfer",
        transferError.message,
        transferError.details,
      );
      return c.text("", 500);
    }
  } else if (event.type == "payment_intent.processing") {
    const paymentIntent = event.data.object;

    if (!paymentIntent.customer) {
      console.error("Could no process payment. Missing customer");
      return c.text("", 500);
    }

    let stripeCustomerId = null;
    if (typeof paymentIntent.customer === "string") {
      stripeCustomerId = paymentIntent.customer;
    } else {
      stripeCustomerId = paymentIntent.customer.id;
    }

    const { data: user, error: userError } = await stripeService.getUserId({
      stripeCustomerId,
    });
    if (userError) {
      console.error("Failed to get user", userError.details, userError.message);
      return c.text("", 500);
    }

    const { error: pendingError } = await stripeService.createPendingTransfer({
      userId: user.userId,
      amount: formatAsHex(paymentIntent.amount),
      stripeCustomerId: stripeCustomerId,
      stripePaymentIntentId: paymentIntent.id,
    });
    if (pendingError) {
      return c.text("", 500);
    }
  } else if (
    event.type == "payment_intent.canceled" ||
    event.type == "payment_intent.payment_failed"
  ) {
    console.warn("Voiding payment", event.data.object.cancellation_reason);
    const paymentIntent = event.data.object;

    if (!paymentIntent.customer) {
      console.error("Could no process payment. Missing customer");
      return c.text("", 500);
    }

    const { data: pending, error: pendingError } =
      await stripeService.getPendingTransfer({
        stripePaymentIntentId: paymentIntent.id,
      });
    if (pendingError) {
      console.error(
        "Failed to get pending transfer",
        pendingError.details,
        pendingError.message,
      );
      return c.text("", 500);
    }

    if (!pending.tigerbeetleTransferId) {
      console.error(
        "Failed to void cancelled transfer. No transfer was found.",
      );
      return c.text("", 500);
    }

    const { error: transferError } = await stripeService.voidPendingTransfer({
      amount: formatAsHex(paymentIntent.amount),
      tigerbeetleTransferId: pending.tigerbeetleTransferId,
      userId: pending.userId,
    });
    if (transferError) {
      console.error(
        "Failed to void pending transfer",
        transferError.message,
        transferError.details,
      );
      return c.text("", 500);
    }
  } else {
    console.log("[STRIPE] unknown event", event.type);
  }

  return c.text("", 200);
});
