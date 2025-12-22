import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { setCookie } from "hono/cookie";
import { jwt } from "hono/jwt";
import { UAParser } from "ua-parser-js";

import {
  apiErrorResponseSchema,
  createSingleError,
  createUnexpectedError,
} from "@repo/validators/error";
import {
  createUserRequestSchema,
  getActiveSessionsResponseSchema,
  invalidateSessionRequestSchema,
  OTPAuthenticationRequestSchema,
  refreshTokenRequestCookiesSchema,
  requestAuthenticationRequestSchema,
  sessionSchema,
} from "@repo/validators/user";

import type { JwtPayload } from "..";
import { env } from "../env";
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
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
    },
  }),

  validator("json", requestAuthenticationRequestSchema),

  async (c) => {
    const body = c.req.valid("json");

    const { error } = await userService.requestAuthentication(body);
    if (error != null) {
      if (error.details == "NOT_FOUND") {
        console.warn(
          "Failed to create authentication request: user does not exist",
          body,
        );
        return c.text("Success", 200);
      }
      console.error(
        "Failed to create authentication request for user:",
        body,
        error,
      );
      return c.json(createUnexpectedError(), 500);
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
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
      406: {
        description: "Invalid phone number and/or authentication code",
        content: {
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
    },
  }),

  validator("json", OTPAuthenticationRequestSchema),

  async (c) => {
    const body = c.req.valid("json");

    const userAgent = c.req.header("User-Agent");
    if (!userAgent) {
      console.info("Failed to login, missing useragent header");
      return c.json(createUnexpectedError(), 500);
    }
    const userAgentParser = UAParser(userAgent);

    const ipAddress = c.req.header("x-forwarded-for");
    if (!ipAddress) {
      console.error("Failed to login, missing x-forwarded-for");
      return c.json(createUnexpectedError(), 500);
    }

    const { data, error } = await userService.authenticateWithOTP({
      ...body,
      application: userAgentParser.browser.name ?? "Unknown",
      device: userAgentParser.os.name ?? "Unknown",
      ipAddress: ipAddress,
    });
    if (error != null) {
      console.log(error);
      if (error.details == "NOT_FOUND" || error.details == "OTP_MISMATCH") {
        return c.json(
          createSingleError("INVALID_INPUT", "Invalid number and/or code"),
          406,
        );
      }

      return c.json(createUnexpectedError(), 500);
    }

    if (!Object.values(data).every((v) => v !== undefined)) {
      console.error(
        "OTP authentication failed: user service data null check failed",
      );
      return c.json(createUnexpectedError(), 500);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    setCookie(c, "refreshToken", data.refreshToken!, {
      sameSite: "Strict",
      httpOnly: true,
      secure: process.env.NODE_ENV?.toUpperCase() === "PRODUCTION",
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
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
    },
  }),

  validator("cookie", refreshTokenRequestCookiesSchema),

  async (c) => {
    const cookies = c.req.valid("cookie");

    const { data, error } = await userService.refreshToken(cookies);
    if (error != null) {
      console.error("Failed to refresh session", error);
      return c.json(createUnexpectedError(), 500);
    }

    if (!Object.values(data).every((v) => v !== undefined)) {
      console.error(
        "OTP authentication failed: user service data null check failed",
      );
      return c.json(createUnexpectedError(), 500);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    setCookie(c, "refreshToken", data.refreshToken!, {
      sameSite: "Strict",
      httpOnly: true,
      secure: process.env.NODE_ENV?.toUpperCase() === "PRODUCTION",
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
  "/sign-up",
  describeRoute({
    description: "Creates a user",
    responses: {
      201: {
        description: "Successfully created a user",
        content: {
          "text/plain": {
            example: "Created",
          },
        },
      },
      500: {
        description:
          "Error has occurred, for security reasons details are omitted",
        content: {
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
    },
  }),

  validator("json", createUserRequestSchema),

  async (c) => {
    const request = c.req.valid("json");

    const { error } = await userService.createUser({
      ...request,
      birthDate: request.birthDate.toISOString(),
    });
    if (error !== null) {
      if (error.details == "CONFLICT") {
        return c.text("Created", 201);
      }
      return c.json(createUnexpectedError(), 500);
    }
    return c.text("Created", 201);
  },
);

authRouter.use(
  "/sessions",
  jwt({ secret: env.USER_BFF_JWT_SECRET, alg: env.USER_BFF_JWT_ALG }),
);

authRouter.get(
  "/sessions",
  describeRoute({
    description:
      "Gets a list of active sessions for the authenticated user. Requires the use of bearer authentication",
    responses: {
      200: {
        description: "A successful response",
        content: {
          "application/json": {
            schema: resolver(getActiveSessionsResponseSchema),
          },
        },
      },
      500: {
        description:
          "Error has occurred, for security reasons details are omitted",
        content: {
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
      401: {
        description: "Missing authentication",
      },
    },
  }),

  async (c) => {
    const { sub: userId } = c.get("jwtPayload") as JwtPayload;

    const { data, error } = await userService.getActiveSessions({
      userId,
    });

    if (error != null) {
      console.error("Failed to get active sessions", error);
      return c.json(createUnexpectedError(), 500);
    }

    return c.json(data);
  },
);

authRouter.delete(
  "/sessions",
  describeRoute({
    description:
      "Invalidates a session and prevents any new access tokens from being issued with its refresh token",
    responses: {
      200: {
        description: "A successful response",
      },
      500: {
        description:
          "Error has occurred, for security reasons details are omitted",
        content: {
          "application/json": {
            schema: resolver(apiErrorResponseSchema),
          },
        },
      },
      401: {
        description: "Missing authentication",
      },
    },
  }),

  validator("json", invalidateSessionRequestSchema),

  async (c) => {
    const { sub: userId } = c.get("jwtPayload") as JwtPayload;
    const { sessionId } = c.req.valid("json");

    const { error } = await userService.invalidateSession({
      sessionId,
      userId,
    });
    if (error != null) {
      console.error("Failed to invalidate session", error);
      return c.json(createUnexpectedError(), 500);
    }

    return c.text("Success", 200);
  },
);
