import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { jwt } from "hono/jwt";
import Long from "long";

import type { ApiErrorResponse } from "@repo/validators/error";
import {
  apiErrorResponseSchema,
  createUnexpectedError,
} from "@repo/validators/error";
import { createPaymentApiRequestSchema } from "@repo/validators/payment";

import type { JwtPayload } from "..";
import { env } from "../env";
import { paymentService } from "../services/paymentService";

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

  validator("json", createPaymentApiRequestSchema),

  async (c) => {
    const { sub: userId } = c.get("jwtPayload") as JwtPayload;
    const { toUserId, amount } = c.req.valid("json");

    const { error } = await paymentService.createPayment({
      toUserId,
      amount: Long.fromInt(amount),
      fromUserId: userId,
    });

    console.error(error);

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
