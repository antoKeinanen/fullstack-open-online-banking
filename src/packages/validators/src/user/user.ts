import { z } from "zod";

import { isOverYears } from "../lib";

export const userSchema = z.object({
  userId: z.string(),
  phoneNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  createdAt: z.iso.datetime(),
  balance: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const getUserRequestSchema = z.object({
  userId: z.e164(),
});
export type GetUserRequest = z.infer<typeof userSchema>;

export const createUserRequestSchema = z.object({
  phoneNumber: z.e164(),
  firstName: z.string().nonempty(),
  lastName: z.string().nonempty(),
  address: z.string().nonempty(),
  birthDate: z.coerce.date().refine((birthDate) => isOverYears(18, birthDate)),
  isResident: z.literal(true),
  isTruth: z.literal(true),
});
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export const getUserResponseSchema = userSchema;
export type getUserResponse = z.infer<typeof getUserResponseSchema>;
