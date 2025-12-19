import { isBefore, parse as parseDate } from "date-fns";
import { z } from "zod";

export const userSchema = z.object({
  userId: z.string(),
  phoneNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  createdAt: z.iso.datetime(),
  balance: z.string(),
});

export const requestAuthenticationRequestSchema = z.object({
  phoneNumber: z.string().nonempty(),
});

export const createUserRequestSchema = z.object({
  phoneNumber: z.e164(),
  firstName: z.string().nonempty(),
  lastName: z.string().nonempty(),
  address: z.string().nonempty(),
  birthDate: z.coerce.date().refine((birthDate) => isOverYears(18, birthDate)),
  isResident: z.literal(true),
  isTruth: z.literal(true),
});
export const getUserRequestSchema = z.object({
  userId: z.e164(),
});

export const OTPAuthenticationRequestSchema = z.object({
  phoneNumber: z.e164(),
  code: z
    .string()
    .length(6)
    .regex(/^[0-9]+$/),
});

export const sessionSchema = z.object({
  accessToken: z.string().nonempty(),
  accessTokenExpires: z.iso.datetime(),
});

export const refreshTokenRequestCookies = z.object({
  refreshToken: z.jwt(),
});

export function isOverYears(years: number, date: Date): boolean {
  const now = new Date();
  const targetDate = new Date(date);
  targetDate.setFullYear(targetDate.getFullYear() + years);
  return isBefore(targetDate, now);
}

export const signUpFormSchema = z
  .object({
    firstName: z.string().nonempty(),
    lastName: z.string().nonempty(),
    phoneNumber: z.e164(),
    homeAddress: z.string().nonempty(),
    postCode: z.string().length(5),
    city: z.string().nonempty(),
    birthDay: z.string().regex(/^\d+$/),
    birthMonth: z.string().regex(/^\d+$/),
    birthYear: z.string().regex(/^\d+$/),
    isResident: z.boolean().refine((v) => v === true, "Required"),
    isTruth: z.boolean().refine((v) => v === true, "Required"),
  })

  .superRefine(({ birthDay, birthMonth, birthYear }, ctx) => {
    const birthDate = parseDate(
      `${birthDay}/${birthMonth}/${birthYear}`,
      "dd/MM/yyyy",
      new Date(),
    );

    if (isNaN(birthDate.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid date",
        path: ["birthDay"],
      });
      ctx.addIssue({
        code: "custom",
        message: "Invalid date",
        path: ["birthMonth"],
      });
      ctx.addIssue({
        code: "custom",
        message: "Invalid date",
        path: ["birthYear"],
      });
      return;
    }

    if (!isOverYears(18, birthDate)) {
      ctx.addIssue({
        code: "custom",
        message: "You must be at least 18 years old",
        path: ["birthDay"],
      });
      ctx.addIssue({
        code: "custom",
        message: "You must be at least 18 years old",
        path: ["birthMonth"],
      });
      ctx.addIssue({
        code: "custom",
        message: "You must be at least 18 years old",
        path: ["birthYear"],
      });
    }
  });
export type SignUpFormValues = z.infer<typeof signUpFormSchema>;

export const getActiveSessionsResponseSchema = z.object({
  sessions: z.array(
    z.object({
      sessionId: z.string(),
      createdAt: z.iso.datetime(),
      expires: z.iso.datetime(),
      device: z.string(),
      application: z.string(),
      ipAddress: z.string(),
    }),
  ),
});
export type GetActiveSessionsResponse = z.infer<
  typeof getActiveSessionsResponseSchema
>;

export const invalidateSessionRequestSchema = z.object({
  sessionId: z.string(),
});
export type InvalidateSessionRequest = z.infer<
  typeof invalidateSessionRequestSchema
>;

export const signUpRequestSchema = z.object({});

export const GetUserBalanceRequestSchema = z.object({
  userId: z.string(),
});

export const GetUserBalanceResponseSchema = z.object({
  balance: z.string(),
});

export const createUserResponseSchema = userSchema;
export const getUserResponseSchema = userSchema;

export type User = z.infer<typeof userSchema>;

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

export type GetUserRequest = z.infer<typeof getUserRequestSchema>;
export type GetUserResponse = z.infer<typeof getUserResponseSchema>;

export type RequestAuthenticationRequest = z.infer<
  typeof requestAuthenticationRequestSchema
>;

export type OTPAuthenticationRequest = z.infer<
  typeof OTPAuthenticationRequestSchema
>;
export type Session = z.infer<typeof sessionSchema>;
