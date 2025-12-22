import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { jwt } from "hono/jwt";
import Long from "long";

import type { ApiErrorResponse } from "@repo/validators/error";
import {
  apiErrorResponseSchema,
  createUnexpectedError,
} from "@repo/validators/error";
import { createPaymentRequestSchema } from "@repo/validators/payment";

import type { JwtPayload } from "..";
import { env } from "../env";
import { paymentService } from "../services/paymentService";
import { userService } from "../services/userService";

export const paymentRouter = new Hono();

paymentRouter.use(
  "*",
  jwt({ secret: env.USER_BFF_JWT_SECRET, alg: env.USER_BFF_JWT_ALG }),
);

// TODO: make idempotent
paymentRouter.post(
  "/transfer",
  describeRoute({
    description: "Transfers funds from a user to another user",
    responses: {
      200: {
        description: "A successful response",
        content: {
          "text/plain": {
            example: "Success",
          },
        },
      },
      401: {
        description: "Missing or expired access token",
      },
      404: {
        description: "The phone number does not match any users on record",
        content: {
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
      500: {
        description:
          "An error has occurred. Refer to the response error object",
        content: {
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
    },
  }),

  validator("json", createPaymentRequestSchema),

  async (c) => {
    const { sub: userId } = c.get("jwtPayload") as JwtPayload;
    const { toUserPhoneNumber, amount } = c.req.valid("json");

    const { data: toUser, error: toUserError } =
      await userService.getUserByPhoneNumber({
        phoneNumber: toUserPhoneNumber,
      });
    if (toUserError != null) {
      if (toUserError.details == "NOT_FOUND") {
        const errors: ApiErrorResponse = {
          errors: [
            {
              code: "NOT_FOUND",
              message: "User with the phone number does not exist.",
              showUser: true,
            },
          ],
        };
        return c.json(errors, 404);
      }
      console.error(toUserError);
      return c.json(createUnexpectedError(), 500);
    }

    const { error } = await paymentService.createPayment({
      toUserId: toUser.userId,
      amount: Long.fromInt(amount),
      fromUserId: userId,
    });

    if (error != null) {
      if (error.details == "NOT_ENOUGH_FUNDS") {
        const errors: ApiErrorResponse = {
          errors: [
            {
              code: "NOT_ENOUGH_FUNDS",
              message: "Insufficient balance",
              showUser: true,
            },
          ],
        };
        return c.json(errors, 500);
      }
      console.error("Failed to create transaction", error.message);
      return c.json(createUnexpectedError(), 500);
    }

    return c.text("Success", 200);
  },
);
