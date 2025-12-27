import { z } from "zod";

import { userSchema } from "./user";

export const requestAuthenticationRequestSchema = z.object({
  phoneNumber: z.e164(),
});
export type RequestAuthenticationRequest = z.infer<
  typeof requestAuthenticationRequestSchema
>;

export const OTPAuthenticationRequestSchema = z.object({
  phoneNumber: z.e164(),
  code: z
    .string()
    .length(6)
    .regex(/^[0-9]+$/),
});
export type OTPAuthenticationRequest = z.infer<
  typeof OTPAuthenticationRequestSchema
>;

export const sessionSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpires: z.iso.datetime(),
});
export type Session = z.infer<typeof sessionSchema>;

export const refreshTokenRequestCookiesSchema = z.object({
  refreshToken: z.jwt(),
});
export type RefreshTokenRequestCookies = z.infer<
  typeof refreshTokenRequestCookiesSchema
>;

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

export const createUserResponseSchema = userSchema;
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

export const invalidateSessionRequestSchema = z.object({
  sessionId: z.string(),
});
export type InvalidateSessionRequest = z.infer<
  typeof invalidateSessionRequestSchema
>;
