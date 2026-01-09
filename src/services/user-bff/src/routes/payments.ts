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

import type { Env } from "..";
import { env } from "../env";
import {
  cacheTransaction,
  getTransaction,
  updateTransactionState,
} from "../services/idempotencyService";
import { paymentService } from "../services/paymentService";
import { userService } from "../services/userService";
import { attrs, events } from "../util/attr";
import { redactPhoneNumber } from "../util/redactor";

export const paymentRouter = new Hono<Env>();

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
      422: {
        description:
          "An error has occurred. Refer to the response error object",
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
    const span = c.get("span");
    const { sub: userId } = c.get("jwtPayload");
    const { toUserPhoneNumber, amount, idempotencyKey } = c.req.valid("json");

    span.setAttributes({
      [attrs.ATTR_USER_ID]: userId,
      [attrs.ATTR_PAYMENT_IDEMPOTENCY_KEY]: idempotencyKey,
      [attrs.ATTR_PAYMENT_AMOUNT]: amount,
      [attrs.ATTR_PAYMENT_TO_USER_PHONE]: redactPhoneNumber(toUserPhoneNumber),
    });

    const transaction = await getTransaction(userId, idempotencyKey);
    if (transaction) {
      span.setAttribute(
        attrs.ATTR_PAYMENT_TRANSACTION_STATE,
        transaction.state,
      );
      switch (transaction.state) {
        case "pending":
          span.addEvent(events.EVENT_PAYMENT_TRANSFER_DUPLICATE_PENDING);
          return c.json(
            createSingleError(
              "IDEMPOTENCY_ERROR",
              "The server is already processing this transaction",
            ),
            500,
          );
        case "failed":
          span.addEvent(events.EVENT_PAYMENT_TRANSFER_DUPLICATE_FAILED);
          return c.json(
            createSingleError(
              "IDEMPOTENCY_ERROR",
              "Transaction has already failed. If this was a mistake please create a new one.",
            ),
            500,
          );
        case "success":
          span.addEvent(events.EVENT_PAYMENT_TRANSFER_DUPLICATE_SUCCESS);
          return c.text("Success", 200);
        default: {
          const _exhaustive: never = transaction.state;
          break;
        }
      }
    }

    const paymentId = randomUUIDv7().replaceAll("-", "");
    span.setAttribute(attrs.ATTR_PAYMENT_ID, paymentId);
    await cacheTransaction(userId, idempotencyKey, paymentId, "pending");

    const { data: toUser, error: toUserError } = await userService.call(
      "getUserByPhoneNumber",
      {
        phoneNumber: toUserPhoneNumber,
      },
    );
    if (toUserError != null) {
      span.recordException(toUserError);
      await updateTransactionState(userId, idempotencyKey, "failed");

      if (toUserError.details == "NOT_FOUND") {
        span.addEvent(events.EVENT_PAYMENT_TRANSFER_RECIPIENT_NOT_FOUND);
        return c.json(
          createSingleError(
            "NOT_FOUND",
            "User with the phone number does not exist.",
          ),
          404,
        );
      }
      span.addEvent(events.EVENT_PAYMENT_TRANSFER_RECIPIENT_LOOKUP_FAILURE);
      return c.json(createUnexpectedError(), 500);
    }

    span.setAttributes({
      [attrs.ATTR_PAYMENT_FROM_USER_ID]: userId,
      [attrs.ATTR_PAYMENT_TO_USER_ID]: toUser.userId,
    });

    if (userId === toUser.userId) {
      await updateTransactionState(userId, idempotencyKey, "failed");
      span.addEvent(events.EVENT_PAYMENT_TRANSFER_SELF_TRANSFER);
      return c.json(
        createSingleError(
          "INVALID_INPUT",
          "You cannot send balance to yourself",
        ),
        422,
      );
    }

    const { error } = await paymentService.call("createPayment", {
      toUserId: toUser.userId,
      amount: Long.fromInt(amount),
      fromUserId: userId,
    });

    if (error != null) {
      span.recordException(error);
      await updateTransactionState(userId, idempotencyKey, "failed");

      if (error.details === "NOT_ENOUGH_FUNDS") {
        span.addEvent(events.EVENT_PAYMENT_TRANSFER_INSUFFICIENT_FUNDS);
        return c.json(
          createSingleError("NOT_ENOUGH_FUNDS", "Insufficient balance"),
          422,
        );
      }
      span.addEvent(events.EVENT_PAYMENT_TRANSFER_FAILURE);
      return c.json(createUnexpectedError(), 500);
    }

    await updateTransactionState(userId, idempotencyKey, "success");
    span.addEvent(events.EVENT_PAYMENT_TRANSFER_SUCCESS);

    return c.text("Success", 200);
  },
);
