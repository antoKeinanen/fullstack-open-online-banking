import { z } from "zod";

export const userSchema = z.object({
  userId: z.string(),
  phoneNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  createdAt: z.iso.datetime(),
});

export const getAllUsersRequestSchema = z.object({
  offset: z.coerce.number().default(0),
  take: z.coerce.number().default(100),
});

export const getAllUsersResponseSchema = z.object({
  users: z.array(userSchema),
  count: z.number(),
});

export const requestAuthenticationRequestSchema = z.object({
  phoneNumber: z.string().nonempty(),
});

export const createUserRequestSchema = z.object({
  firstName: z.string().nonempty(),
  lastName: z.string().nonempty(),
  phoneNumber: z.string().nonempty(),
  address: z.string().nonempty(),
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

export const createUserResponseSchema = userSchema;
export const getUserResponseSchema = userSchema;

export type User = z.infer<typeof userSchema>;

export type GetAllUsersRequest = z.infer<typeof getAllUsersRequestSchema>;
export type GetAllUsersResponse = z.infer<typeof getAllUsersResponseSchema>;

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
