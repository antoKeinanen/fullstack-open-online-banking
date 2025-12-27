import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { jwt } from "hono/jwt";
import Long from "long";

import {
  apiErrorResponseSchema,
  createUnexpectedError,
} from "@repo/validators/error";
import {
  getUserTransfersRequestSchema,
  getUserTransfersResponseSchema,
  userSchema,
} from "@repo/validators/user";

import type { JwtPayload } from "..";
import { env } from "../env";
import { userService } from "../services/userService";

export const userRouter = new Hono();

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
    const { sub: userId } = c.get("jwtPayload") as JwtPayload;
    const { data, error } = await userService.getUserById({ userId });
    if (error != null) {
      console.error("Failed to get user", error);
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
    const request = c.req.valid("query");
    const { sub: userId } = c.get("jwtPayload") as JwtPayload;

    const { data, error } = await userService.getUserTransfers({
      userId: userId,
      limit: request.limit,
      maxTimestamp: request.maxTimestamp
        ? new Long(request.maxTimestamp)
        : undefined,
      minTimestamp: request.minTimestamp
        ? new Long(request.minTimestamp)
        : undefined,
    });

    if (error != null) {
      console.error(
        "Failed to get transfers relating to user",
        error.message,
        error.metadata,
      );
      return c.json(createUnexpectedError(), 500);
    }

    return c.json(data, 200);
  },
);
