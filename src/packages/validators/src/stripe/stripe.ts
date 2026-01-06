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
