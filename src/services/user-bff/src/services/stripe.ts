import StripeSDK from "stripe";

import { StripeService } from "@repo/service-bindings/stripe-service";

import { env } from "../env";

export const stripe = new StripeSDK(env.USER_BFF_STRIPE_SECRET_KEY);

export const stripeService = new StripeService(env.USER_BFF_STRIPE_SERVICE_URL);
