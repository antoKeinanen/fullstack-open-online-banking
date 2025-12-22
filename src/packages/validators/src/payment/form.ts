import z from "zod";

export const createPaymentFormSchema = z.object({
  userPhoneNumber: z.e164(),
  amount: z.coerce
    .number()
    .multipleOf(0.01)
    .positive()
    .max(10 ** 4),
});
export type CreatePaymentForm = z.infer<typeof createPaymentFormSchema>;
