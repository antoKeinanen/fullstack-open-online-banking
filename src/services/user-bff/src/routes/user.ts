import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { jwt } from "hono/jwt";

import { userSchema } from "@repo/validators/user";

import type { JwtPayload } from "..";
import { env } from "../env";
import { userService } from "../services/userService";

export const userRouter = new Hono();

userRouter.use(
  "*I",
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
          "Error has occurred, for security reasons details are omitted",
        content: {
          "text/plain": {
            example: "Action failed",
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
      return c.text("Action failed", 500);
    }

    return c.json(data);
  },
);
