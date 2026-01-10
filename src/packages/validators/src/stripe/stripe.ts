import z from "zod";

export const generateStripeCheckoutRequestSchema = z.object({
  amount: z.coerce.number().multipleOf(0.01).min(0.01).max(10_000),
});
export type GenerateStripeCheckoutRequest = z.infer<
  typeof generateStripeCheckoutRequestSchema
>;

export const generateStripeCheckoutResponseSchema = z.object({
  url: z.string(),
});
export type GenerateStripeCheckoutResponse = z.infer<
  typeof generateStripeCheckoutResponseSchema
>;

export const getOnboardingUrlResponseSchema = z.object({
  url: z.url(),
});
export type GetOnboardingUrlResponse = z.infer<
  typeof getOnboardingUrlResponseSchema
>;

export const createStripePayoutSchema = z.object({
  amount: z
    .number()
    .int()
    .min(1)
    .max(10 ** 6),
  idempotencyKey: z.uuidv4(),
});
export type CreateStripePayoutRequest = z.infer<
  typeof createStripePayoutSchema
>;

export const createStripePayoutFormSchema = z.object({
  amount: z.coerce
    .number()
    .multipleOf(0.01)
    .positive()
    .max(10 ** 4),
  idempotencyKey: z.uuidv4(),
});
export type CreateStripePayoutForm = z.infer<
  typeof createStripePayoutFormSchema
>;

export const payoutEligibilityResponseSchema = z.object({
  eligible: z.boolean(),
  reason: z.string().nullable(),
});
export type PayoutEligibilityResponse = z.infer<
  typeof payoutEligibilityResponseSchema
>;
