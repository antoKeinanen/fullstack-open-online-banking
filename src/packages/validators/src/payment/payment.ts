import z from "zod";

export const createPaymentRequestSchema = z.object({
  toUserPhoneNumber: z.e164(),
  amount: z
    .number()
    .int()
    .min(0)
    .max(10 ** 6),
  idempotencyKey: z.uuidv4(),
});
export type CreatePaymentApiRequest = z.infer<
  typeof createPaymentRequestSchema
>;
