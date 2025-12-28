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
export type GetUserRequest = z.infer<typeof getUserRequestSchema>;

export const createUserRequestSchema = z.object({
  phoneNumber: z.e164(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: z.string().min(1),
  birthDate: z.coerce.date().refine((birthDate) => isOverYears(18, birthDate)),
  isResident: z.literal(true),
  isTruth: z.literal(true),
});
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export const getUserResponseSchema = userSchema;
export type GetUserResponse = z.infer<typeof getUserResponseSchema>;

export const getUserTransfersRequestSchema = z.object({
  maxTimestamp: z.iso.datetime().optional(),
  minTimestamp: z.iso.datetime().optional(),
  limit: z.coerce.number().multipleOf(1).min(1).max(100).optional().default(10),
});
export type GetUserTransfersRequest = z.infer<
  typeof getUserTransfersRequestSchema
>;

export const transferSchema = z.object({
  transferId: z.string(),
  debitAccountId: z.string(),
  creditAccountId: z.string(),
  amount: z.string(),
  debitUserFullName: z.string(),
  creditUserFullName: z.string(),
  timestamp: z.iso.datetime(),
  isIncreasingTransfer: z.boolean(),
  isSystemTransfer: z.boolean(),
});
export type Transfer = z.infer<typeof transferSchema>;

export const getUserTransfersResponseSchema = z.object({
  transfers: z.array(transferSchema),
});
export type GetUserTransfersResponse = z.infer<
  typeof getUserTransfersResponseSchema
>;
