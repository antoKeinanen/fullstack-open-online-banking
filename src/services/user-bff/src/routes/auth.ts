import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { setCookie } from "hono/cookie";

import {
  OTPAuthenticationRequestSchema,
  refreshTokenRequestCookies,
  requestAuthenticationRequestSchema,
  sessionSchema,
} from "@repo/validators/user";

import { userService } from "../services/userService";

export const authRouter = new Hono();

authRouter.post(
  "/request-authentication",
  describeRoute({
    description: "Generates authentication code and sends it to the user",
    responses: {
      200: {
        description:
          "Authentication code was generated and sent to user if user with the phone number exists",
        content: {
          "text/plain": {
            example: "Success",
          },
        },
      },
      500: {
        description: "Unexpected error has occurred",
        content: {
          "text/plain": {
            example: "Action failed",
          },
        },
      },
    },
  }),

  validator("query", requestAuthenticationRequestSchema),

  async (c) => {
    const query = c.req.valid("query");

    const { error } = await userService.requestAuthentication(query);
    if (error != null) {
      if (error.details == "user_not_found") {
        console.warn(
          "Failed to create authentication request: user does not exist",
          query,
        );
        return c.text("Success", 200);
      }
      console.error(
        "Failed to create authentication request for user:",
        query,
        error,
      );
      return c.text("Action failed", 500);
    }

    return c.text("Success", 200);
  },
);

authRouter.post(
  "/authenticate-with-otp",
  describeRoute({
    description:
      "Get jwt token pair with the OTP code issued to user by calling request-authentication",
    responses: {
      200: {
        description: "Successful response, tokens issued",
        content: {
          "application/json": {
            schema: resolver(sessionSchema),
          },
        },
        headers: {
          "Set-Cookie": {
            description: "JWT refresh token",
          },
        },
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
      406: {
        description: "Invalid phone number and/or authentication code",
        content: {
          "text/plain": {
            example: "Invalid number and/or code",
          },
        },
      },
    },
  }),

  validator("query", OTPAuthenticationRequestSchema),

  async (c) => {
    const query = c.req.valid("query");

    const { data, error } = await userService.authenticateWithOTP(query);
    if (error != null) {
      console.log(error);
      if (
        error.details == "user_not_found" ||
        error.details == "codes_do_not_match"
      ) {
        return c.text("Invalid number and/or code", 406);
      }

      return c.text("Action failed", 500);
    }

    if (!Object.values(data).every((v) => v !== undefined)) {
      console.error(
        "OTP authentication failed: user service data null check failed",
      );
      return c.text("Action failed", 500);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    setCookie(c, "refreshToken", data.refreshToken!, {
      sameSite: "Strict",
      httpOnly: true,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expires: new Date(data.refreshTokenExpires!),
    });

    return c.json(
      {
        accessToken: data.accessToken,
        accessTokenExpires: data.accessTokenExpires,
      },
      200,
    );
  },
);

authRouter.post(
  "/refresh-tokens",
  describeRoute({
    description: "Refresh jwt token pair with the refresh token",
    responses: {
      200: {
        description: "Successful response, tokens issued",
        content: {
          "application/json": {
            schema: resolver(sessionSchema),
          },
        },
        headers: {
          "Set-Cookie": {
            description: "a new JWT refresh token",
          },
        },
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

  validator("cookie", refreshTokenRequestCookies),

  async (c) => {
    const cookies = c.req.valid("cookie");

    const { data, error } = await userService.refreshToken(cookies);
    if (error != null) {
      console.error("Failed to refresh session", error);
      return c.text("Action failed", 500);
    }

    if (!Object.values(data).every((v) => v !== undefined)) {
      console.error(
        "OTP authentication failed: user service data null check failed",
      );
      return c.text("Action failed", 500);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    setCookie(c, "refreshToken", data.refreshToken!, {
      sameSite: "Strict",
      httpOnly: true,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expires: new Date(data.refreshTokenExpires!),
    });

    return c.json(
      {
        accessToken: data.accessToken,
        accessTokenExpires: data.accessTokenExpires,
      },
      200,
    );
  },
);
