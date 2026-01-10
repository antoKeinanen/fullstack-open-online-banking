import z from "zod";

import type {
  CreateStripePayoutRequest,
  GenerateStripeCheckoutRequest,
} from "@repo/validators/stripe";
import {
  generateStripeCheckoutResponseSchema,
  getOnboardingUrlResponseSchema,
  payoutEligibilityResponseSchema,
} from "@repo/validators/stripe";

import * as api from "../util/api";

export function generateStripeCheckout(req: GenerateStripeCheckoutRequest) {
  return api.post(
    "/api/stripe/generate-stripe-checkout",
    generateStripeCheckoutResponseSchema,
    req,
  );
}

export function getStripeOnboardingUrl() {
  return api.get("/api/stripe/onboard-url", getOnboardingUrlResponseSchema);
}

export function getPayoutEligibility() {
  return api.get(
    "/api/stripe/payout-eligibility",
    payoutEligibilityResponseSchema,
  );
}

export function createPayout(req: CreateStripePayoutRequest) {
  return api.post("/api/stripe/payouts", z.unknown(), req);
}
