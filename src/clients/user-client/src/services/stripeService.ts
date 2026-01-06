import type { GenerateStripeCheckoutRequest } from "@repo/validators/stripe";
import { generateStripeCheckoutResponseSchema } from "@repo/validators/stripe";

import * as api from "../util/api";

export function generateStripeCheckout(req: GenerateStripeCheckoutRequest) {
  return api.post(
    "/api/stripe/generate-stripe-checkout",
    generateStripeCheckoutResponseSchema,
    req,
  );
}
