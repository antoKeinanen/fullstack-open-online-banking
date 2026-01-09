import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { jwt } from "hono/jwt";

import {
  apiErrorResponseSchema,
  createUnexpectedError,
} from "@repo/validators/error";
import {
  getUserTransfersRequestSchema,
  getUserTransfersResponseSchema,
  userSchema,
} from "@repo/validators/user";

import type { Env } from "..";
import { env } from "../env";
import { userService } from "../services/userService";
import { attrs, events } from "../util/attr";

export const userRouter = new Hono<Env>();

userRouter.use(
  "*",
  jwt({ secret: env.USER_BFF_JWT_SECRET, alg: env.USER_BFF_JWT_ALG }),
);

userRouter.get(
  "/",
  describeRoute({
    description: "Returns details about the currently logged in user",
    responses: {
      200: {
        description: "A successful response",
        content: resolver(userSchema),
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

  async (c) => {
    const span = c.get("span");
    const { sub: userId } = c.get("jwtPayload");

    span.setAttribute(attrs.ATTR_USER_ID, userId);

    const { data, error } = await userService.call("getUserById", { userId });
    if (error != null) {
      span.recordException(error);
      span.addEvent(events.EVENT_USER_GET_FAILURE);
      return c.json(createUnexpectedError(), 500);
    }

    return c.json(data);
  },
);

userRouter.get(
  "/transfers",

  describeRoute({
    description:
      "Returns a possibly empty list of transfers relating to the currently logged in user in a chronological order",

    responses: {
      200: {
        description: "A successful response",
        content: {
          "application/json": {
            schema: resolver(getUserTransfersResponseSchema),
          },
        },
      },
      500: {
        description: "The request has failed",
        content: {
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
    },
  }),

  validator("query", getUserTransfersRequestSchema),

  async (c) => {
    const span = c.get("span");
    const request = c.req.valid("query");
    const { sub: userId } = c.get("jwtPayload");

    span.setAttribute(attrs.ATTR_USER_ID, userId);

    const { data, error } = await userService.call("getUserTransfers", {
      userId: userId,
      limit: request.limit,
      maxTimestamp: request.maxTimestamp,
      minTimestamp: request.minTimestamp,
    });

    if (error != null) {
      span.recordException(error);
      span.addEvent(events.EVENT_USER_TRANSFERS_GET_FAILURE);
      return c.json(createUnexpectedError(), 500);
    }

    return c.json(data, 200);
  },
);
