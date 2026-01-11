import type { Span } from "@opentelemetry/api";
import StripeSDK from "stripe";

import { StripeService } from "@repo/service-bindings/stripe-service";

import { env } from "../env";
import { formatAsHex } from "../util/formatter";
import { tryCatch } from "../util/tryCatch";
import { userService } from "./userService";

const stripe = new StripeSDK(env.USER_BFF_STRIPE_SECRET_KEY);

export const stripeService = await StripeService(
  env.USER_BFF_STRIPE_SERVICE_URL,
);

export async function createPayout(
  span: Span,
  userId: string,
  amountInCents: number,
) {
  const { data: stripeAccount, error: stripeAccountError } =
    await stripeService.call("getStripeAccountId", { userId });
  if (stripeAccountError) {
    span.recordException(stripeAccountError);
    return { error: stripeAccountError };
  }
  if (!stripeAccount.stripeAccountId) {
    span.recordException(new Error("Missing stripe account id"));
    return {
      error: new Error("Missing stripe account id. Create one by onboarding"),
    };
  }

  const { data: pendingPayout, error: createPendingPayoutError } =
    await stripeService.call("createPendingPayout", {
      amount: formatAsHex(amountInCents),
      stripeAccountId: stripeAccount.stripeAccountId,
      userId,
    });

  if (createPendingPayoutError) {
    span.recordException(createPendingPayoutError);
    return { error: createPendingPayoutError };
  }

  if (!pendingPayout.tigerbeetleTransferId) {
    span.recordException(new Error("Missing tigerbeetle transfer id"));
    return { error: new Error("Could not create payout") };
  }

  const { data: stripeTransfer, error: stripeTransferError } = await tryCatch(
    stripe.transfers.create({
      amount: amountInCents,
      currency: "eur",
      description: "Withdrawal from fso banking",
      destination: stripeAccount.stripeAccountId,
      metadata: {
        tigerbeetleId: pendingPayout.tigerbeetleTransferId,
      },
    }),
  );
  if (stripeTransferError) {
    span.recordException(stripeTransferError);
    return { error: stripeTransferError };
  }

  const { error: setPayoutIdError } = await stripeService.call(
    "setStripePayoutId",
    {
      tigerbeetleTransferId: pendingPayout.tigerbeetleTransferId,
      stripePayoutId: stripeTransfer.id,
    },
  );

  if (setPayoutIdError) {
    span.recordException(setPayoutIdError);
    return { error: setPayoutIdError };
  }

  return { error: null };
}

export async function checkPayoutEligibility(span: Span, userId: string) {
  const { data: stripeAccount, error: stripeAccountError } =
    await stripeService.call("getStripeAccountId", { userId });
  if (stripeAccountError) {
    span.recordException(stripeAccountError);
    return { error: stripeAccountError };
  }

  if (!stripeAccount.stripeAccountId) {
    return {
      data: {
        eligible: false,
        reason: "No Stripe account found. Please complete onboarding.",
      },
    };
  }

  const { data: account, error: accountError } = await tryCatch(
    stripe.accounts.retrieve(stripeAccount.stripeAccountId),
  );
  if (accountError) {
    span.recordException(accountError);
    return { error: accountError };
  }

  if (!account.payouts_enabled) {
    return {
      data: {
        eligible: false,
        reason: "Payouts are not enabled. Please complete onboarding.",
      },
    };
  }

  if (!account.details_submitted) {
    return {
      data: {
        eligible: false,
        reason: "Account details not submitted. Please complete onboarding.",
      },
    };
  }

  return {
    data: {
      eligible: true,
      reason: null,
    },
  };
}

async function getStripeAccountOnboardingLink(
  span: Span,
  stripeAccountId: string,
  type: StripeSDK.AccountLinkCreateParams.Type,
) {
  const { data: stripeAccountLink, error: stripeAccountLinkError } =
    await tryCatch(
      stripe.accountLinks.create({
        account: stripeAccountId,
        type,
        refresh_url: env.USER_BFF_BASE_URL + "/stripe/refresh-onboard",
        return_url: env.USER_BFF_BASE_URL + "/dashboard",
      }),
    );
  if (stripeAccountLinkError) {
    span.recordException(stripeAccountLinkError);
    return { error: stripeAccountLinkError };
  }

  return { data: stripeAccountLink };
}

export async function getOrCreateStripeAccount(span: Span, userId: string) {
  const { data: stripeAccount, error: stripeAccountError } =
    await stripeService.call("getStripeAccountId", { userId });
  if (stripeAccountError) {
    span.recordException(stripeAccountError);
    return { error: stripeAccountError };
  }

  if (stripeAccount.stripeAccountId) {
    return getStripeAccountOnboardingLink(
      span,
      stripeAccount.stripeAccountId,
      "account_onboarding",
    );
  }

  const { data: user, error: userError } = await userService.call(
    "getUserById",
    { userId },
  );
  if (userError) {
    span.recordException(userError);
    return { error: userError };
  }

  const { data: newStripeAccount, error: newStripeAccountError } =
    await tryCatch(
      stripe.accounts.create({
        type: "express",
        country: "FI",
        individual: {
          phone: user.phoneNumber,
          first_name: user.firstName,
          last_name: user.lastName,
        },
        business_profile: {
          product_description: "In app withdrawals",
        },
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          userId,
        },
      }),
    );
  if (newStripeAccountError) {
    span.recordException(newStripeAccountError);
    return { error: newStripeAccountError };
  }

  const { error: setStripeAccountIdError } = await stripeService.call(
    "setStripeAccountId",
    {
      userId,
      stripeAccountId: newStripeAccount.id,
    },
  );
  if (setStripeAccountIdError) {
    span.recordException(setStripeAccountIdError);
    return { error: setStripeAccountIdError };
  }

  return getStripeAccountOnboardingLink(
    span,
    newStripeAccount.id,
    "account_onboarding",
  );
}

export async function getOrCreateStripeCustomer(
  span: Span,
  phoneNumber: string,
  userId: string,
) {
  const { data: customer, error: customerError } = await stripeService.call(
    "getStripeCustomerId",
    { userId: userId },
  );
  if (customerError) {
    span.recordException(customerError);
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
    span.recordException(newCustomerError);
    return { error: newCustomerError };
  }

  const { error: setStripeCustomerIdError } = await stripeService.call(
    "setStripeCustomerId",
    {
      userId: userId,
      stripeCustomerId: newCustomer.id,
    },
  );
  if (setStripeCustomerIdError) {
    span.recordException(setStripeCustomerIdError);
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
      success_url: env.USER_BFF_BASE_URL + "/success",
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
