import z from "zod";

export const createPaymentRequestSchema = z.object({
  toUserId: z.string(),
  amount: z
    .number()
    .int()
    .min(0)
    .max(2 ** 64 - 1),
});
export type CreatePaymentRequest = z.infer<typeof createPaymentRequestSchema>;

export const createPaymentApiRequestSchema = z.object({
  toUserId: z.string(),
  amount: z
    .number()
    .int()
    .min(0)
    .max(2 ** 64 - 1),
});
export type CreatePaymentApiRequest = z.infer<
  typeof createPaymentApiRequestSchema
>;
