import StripeSDK from "stripe";

import { StripeService } from "@repo/service-bindings/stripe-service";

import { env } from "../env";
import { formatAsHex } from "../util/formatter";
import { tryCatch } from "../util/tryCatch";

const stripe = new StripeSDK(env.USER_BFF_STRIPE_SECRET_KEY);

export const stripeService = await StripeService(
  env.USER_BFF_STRIPE_SERVICE_URL,
);

export async function createPayout(userId: string, amountInCents: number) {
  const { data: stripeAccount, error: stripeAccountError } =
    await stripeService.call("getStripeAccountId", { userId });
  if (stripeAccountError) {
    console.error("Failed to get stripe account", stripeAccountError);
    return { error: stripeAccountError };
  }
  if (!stripeAccount.stripeAccountId) {
    console.error("missing stripe account id");
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
    if (createPendingPayoutError.details === "NOT_ENOUGH_FUNDS") {
      console.warn("Failed to create payout. Not enough funds");
      return { error: createPendingPayoutError };
    }

    console.error("Failed to create payout", createPendingPayoutError);
    return { error: createPendingPayoutError };
  }

  if (!pendingPayout.tigerbeetleTransferId) {
    console.error("Failed to create payout. Missing tigerbeetle id");
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
    console.log("Failed to create stripe transfer", stripeTransferError);
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
    console.error("Failed to create payout", setPayoutIdError);
    return { error: setPayoutIdError };
  }

  return { error: null };
}

export async function checkPayoutEligibility(userId: string) {
  const { data: stripeAccount, error: stripeAccountError } =
    await stripeService.call("getStripeAccountId", { userId });
  if (stripeAccountError) {
    console.error("Failed to get stripe account", stripeAccountError);
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
    console.error("Failed to retrieve stripe account", accountError);
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
    console.error(
      "Failed to create stripe account link",
      stripeAccountLinkError,
    );

    return { error: stripeAccountLinkError };
  }

  return { data: stripeAccountLink };
}

export async function getOrCreateStripeAccount(userId: string) {
  const { data: stripeAccount, error: stripeAccountError } =
    await stripeService.call("getStripeAccountId", { userId });
  if (stripeAccountError) {
    console.error("Failed to get stripe account", stripeAccountError);
    return { error: stripeAccountError };
  }

  if (stripeAccount.stripeAccountId) {
    return getStripeAccountOnboardingLink(
      stripeAccount.stripeAccountId,
      "account_onboarding",
    );
  }

  const { data: newStripeAccount, error: newStripeAccountError } =
    await tryCatch(
      stripe.accounts.create({
        type: "express",
        country: "FI",
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
    console.error(
      "Failed to create stripe account",
      newStripeAccountError.message,
    );
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
    console.error(
      "Failed to set stripe account on database",
      setStripeAccountIdError,
    );
    return { error: setStripeAccountIdError };
  }

  return getStripeAccountOnboardingLink(
    newStripeAccount.id,
    "account_onboarding",
  );
}

export async function getOrCreateStripeCustomer(
  phoneNumber: string,
  userId: string,
) {
  const { data: customer, error: customerError } = await stripeService.call(
    "getStripeCustomerId",
    { userId: userId },
  );
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

  const { error: setStripeCustomerIdError } = await stripeService.call(
    "setStripeCustomerId",
    {
      userId: userId,
      stripeCustomerId: newCustomer.id,
    },
  );
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
