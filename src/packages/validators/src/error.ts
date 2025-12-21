import z from "zod";

const errorCodes = [
  "INVALID_INPUT",
  "NOT_FOUND",
  "CONFLICT",
  "ACTION_FAILED",
  "NOT_ENOUGH_FUNDS",
] as const;

export const apiErrorSchema = z.object({
  code: z.enum(errorCodes),
  message: z.string(),
  showUser: z.boolean(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiErrorResponseSchema = z.object({
  errors: z.array(apiErrorSchema),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export function createUnexpectedError(): ApiErrorResponse {
  return {
    errors: [
      {
        code: "ACTION_FAILED",
        message: "Something went wrong. Please try again later",
        showUser: true,
      },
    ],
  };
}
