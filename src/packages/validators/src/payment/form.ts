import z from "zod";

export const createPaymentFormSchema = z.object({
  userId: z.string().nonempty(),
  amount: z.coerce.number().multipleOf(0.01).positive(),
});
export type CreatePaymentForm = z.infer<typeof createPaymentFormSchema>;
