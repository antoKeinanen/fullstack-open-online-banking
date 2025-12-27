import { randomUUIDv7 } from "bun";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { jwt } from "hono/jwt";
import Long from "long";

import {
  apiErrorResponseSchema,
  createSingleError,
  createUnexpectedError,
} from "@repo/validators/error";
import { createPaymentRequestSchema } from "@repo/validators/payment";

import type { JwtPayload } from "..";
import { env } from "../env";
import {
  cacheTransaction,
  getTransaction,
  updateTransactionState,
} from "../services/idempotencyService";
import { paymentService } from "../services/paymentService";
import { userService } from "../services/userService";

export const paymentRouter = new Hono();

paymentRouter.use(
  "*",
  jwt({ secret: env.USER_BFF_JWT_SECRET, alg: env.USER_BFF_JWT_ALG }),
);

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
    const { toUserPhoneNumber, amount, idempotencyKey } = c.req.valid("json");

    const transaction = await getTransaction(userId, idempotencyKey);
    if (transaction) {
      console.warn("Duplicated transaction occurred", transaction);
      if (transaction.state == "pending") {
        return c.json(
          createSingleError(
            "IDEMPOTENCY_ERROR",
            "The server is already processing this transaction",
          ),
          500,
        );
      }
      if (transaction.state === "failed") {
        return c.json(
          createSingleError(
            "IDEMPOTENCY_ERROR",
            "Transaction has already failed. If this was a mistake please create a new one.",
          ),
          500,
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (transaction.state === "success") {
        return c.text("Success", 200);
      }
      console.error(
        "All transaction state checks has failed. Falling back to unexpected error",
      );
      return c.json(createUnexpectedError(), 500);
    }

    const paymentId = randomUUIDv7().replace("-", "");
    await cacheTransaction(userId, idempotencyKey, paymentId, "pending");

    const { data: toUser, error: toUserError } =
      await userService.getUserByPhoneNumber({
        phoneNumber: toUserPhoneNumber,
      });
    if (toUserError != null) {
      await updateTransactionState(userId, idempotencyKey, "failed");

      if (toUserError.details == "NOT_FOUND") {
        return c.json(
          createSingleError(
            "NOT_FOUND",
            "User with the phone number does not exist.",
          ),
          404,
        );
      }
      console.error(toUserError);
      return c.json(createUnexpectedError(), 500);
    }

    if (userId === toUser.userId) {
      await updateTransactionState(userId, idempotencyKey, "failed");

      return c.json(
        createSingleError(
          "INVALID_INPUT",
          "You cannot send balance to yourself",
        ),
        500,
      );
    }

    const { error } = await paymentService.createPayment({
      toUserId: toUser.userId,
      amount: Long.fromInt(amount),
      fromUserId: userId,
    });

    if (error != null) {
      await updateTransactionState(userId, idempotencyKey, "failed");

      if (error.details === "NOT_ENOUGH_FUNDS") {
        return c.json(
          createSingleError("NOT_ENOUGH_FUNDS", "Insufficient balance"),
          500,
        );
      }
      console.error("Failed to create transaction", error.message);
      return c.json(createUnexpectedError(), 500);
    }

    await updateTransactionState(userId, idempotencyKey, "success");

    return c.text("Success", 200);
  },
);
