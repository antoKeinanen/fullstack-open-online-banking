import StripeSDK from "stripe";

import { StripeService } from "@repo/service-bindings/stripe-service";

import { env } from "../env";
import { tryCatch } from "../util/tryCatch";

const stripe = new StripeSDK(env.USER_BFF_STRIPE_SECRET_KEY);

export const stripeService = new StripeService(env.USER_BFF_STRIPE_SERVICE_URL);

export async function getOrCreateStripeCustomer(
  phoneNumber: string,
  userId: string,
) {
  const { data: customer, error: customerError } =
    await stripeService.getStripeCustomerId({ userId: userId });
  if (customerError) {
    console.error(
      "Failed to get stripe customer",
      customerError.message,
      customerError.details,
    );
    return { error: customerError };
  }

  if (customer.stripeCustomerId) {
    return { data: customer.stripeCustomerId };
  }

  const { data: newCustomer, error: newCustomerError } = await tryCatch(
    stripe.customers.create({
      phone: phoneNumber,
      metadata: {
        userId: userId,
      },
    }),
  );
  if (newCustomerError) {
    console.error(
      "Failed to create a new customer",
      newCustomerError.message,
      newCustomerError.stack,
    );
    return { error: newCustomerError };
  }

  const { error: setStripeCustomerIdError } =
    await stripeService.setStripeCustomerId({
      userId: userId,
      stripeCustomerId: newCustomer.id,
    });
  if (setStripeCustomerIdError) {
    console.log(
      "Failed to set stripe customer id for user",
      setStripeCustomerIdError.message,
      setStripeCustomerIdError.stack,
    );
    return { error: setStripeCustomerIdError };
  }

  return { data: newCustomer.id };
}

export async function createStripeCheckout(
  stripeCustomerId: string,
  amount: number,
  userId: string,
) {
  return tryCatch<StripeSDK.Checkout.Session>(
    stripe.checkout.sessions.create({
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
            unit_amount: Math.floor(amount * 100),
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
    }),
  );
}

export async function stripeConstructWebhookEvent(
  body: string,
  signature: string,
) {
  return tryCatch(
    stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.USER_BFF_STRIPE_WEBHOOK_SECRET,
    ),
  );
}

export function createStripeCustomer(phoneNumber: string, userId: string) {
  return tryCatch<StripeSDK.Customer>(
    stripe.customers.create({
      phone: phoneNumber,
      metadata: {
        userId: userId,
      },
    }),
  );
}
