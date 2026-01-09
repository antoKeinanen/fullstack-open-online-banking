import { SpanStatusCode } from "@opentelemetry/api";
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

import type { Env } from "..";
import { env } from "../env";
import { userService } from "../services/userService";
import { attrs, events } from "../util/attr";
import { redactJWT } from "../util/redactor";

export const authRouter = new Hono<Env>();

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
    const span = c.get("span");
    const body = c.req.valid("json");

    const { error } = await userService.call("requestAuthentication", body);
    if (error) {
      span.recordException(error);
      if (error.details === "NOT_FOUND") {
        span.addEvent(events.EVENT_USER_NOT_FOUND);
        span.setStatus({ code: SpanStatusCode.OK });
        return c.text("Success", 200);
      }

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
    const span = c.get("span");
    const body = c.req.valid("json");

    const userAgent = c.req.header("User-Agent");
    if (!userAgent) {
      span.addEvent(events.EVENT_USER_NO_USER_AGENT);
      return c.json(createUnexpectedError(), 500);
    }
    const userAgentParser = UAParser(userAgent);

    span.setAttribute(attrs.ATTR_USER_USER_AGENT, userAgent);

    const forwardedFor = c.req.header("x-forwarded-for");
    if (!forwardedFor) {
      span.addEvent(events.EVENT_USER_NO_FORWARDED_FOR);
      return c.json(createUnexpectedError(), 500);
    }

    const ipAddress = forwardedFor.split(", ")[0];
    if (!ipAddress) {
      span.addEvent(events.EVENT_USER_MALFORMED_FORWARDED_FOR);
      return c.json(createUnexpectedError(), 500);
    }

    span.setAttribute(attrs.ATTR_USER_FORWARDED_FOR, ipAddress);

    const { data, error } = await userService.call("authenticateWithOtp", {
      ...body,
      application: userAgentParser.browser.name ?? "Unknown",
      device: userAgentParser.os.name ?? "Unknown",
      ipAddress: ipAddress,
    });
    if (error) {
      if (error.details === "NOT_FOUND" || error.details === "OTP_MISMATCH") {
        span.addEvent(events.EVENT_AUTH_OTP_MISMATCH);
        span.setAttribute(attrs.ATTR_AUTH_OTP_ERROR_CAUSE, error.details);
        return c.json(
          createSingleError("INVALID_INPUT", "Invalid number and/or code"),
          406,
        );
      }

      span.recordException(error);

      return c.json(createUnexpectedError(), 500);
    }

    span.setAttributes({
      [attrs.ATTR_USER_SESSION_ACCESS_TOKEN]: redactJWT(data.accessToken),
      [attrs.ATTR_USER_SESSION_ACCESS_TOKEN_EXPIRES]: data.accessTokenExpires,
      [attrs.ATTR_USER_SESSION_REFRESH_TOKEN]: redactJWT(data.refreshToken),
      [attrs.ATTR_USER_SESSION_REFRESH_TOKEN_EXPIRES]: data.refreshTokenExpires,
    });

    if (!Object.values(data).every((v) => v !== undefined)) {
      span.addEvent(events.EVENT_NULLITY_CHECK_FAILURE);
      return c.json(createUnexpectedError(), 500);
    }

    span.addEvent(events.EVENT_COOKIE_SET);
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
    const span = c.get("span");
    const cookies = c.req.valid("cookie");

    const { data, error } = await userService.call("refreshToken", cookies);
    if (error != null) {
      span.recordException(error);
      return c.json(createUnexpectedError(), 500);
    }

    if (!Object.values(data).every((v) => v !== undefined)) {
      span.addEvent(events.EVENT_REFRESH_TOKEN_NULL_CHECK_FAILURE);
      return c.json(createUnexpectedError(), 500);
    }

    span.setAttributes({
      [attrs.ATTR_USER_SESSION_ACCESS_TOKEN]: redactJWT(data.accessToken),
      [attrs.ATTR_USER_SESSION_ACCESS_TOKEN_EXPIRES]: data.accessTokenExpires,
      [attrs.ATTR_USER_SESSION_REFRESH_TOKEN]: redactJWT(data.refreshToken),
      [attrs.ATTR_USER_SESSION_REFRESH_TOKEN_EXPIRES]: data.refreshTokenExpires,
    });

    span.addEvent(events.EVENT_COOKIE_SET);
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
    const span = c.get("span");
    const request = c.req.valid("json");

    const { error } = await userService.call("createUser", {
      ...request,
      birthDate: request.birthDate.toISOString(),
    });
    if (error !== null) {
      if (error.details === "CONFLICT") {
        span.addEvent(events.EVENT_SIGN_UP_CONFLICT);
        span.setStatus({ code: SpanStatusCode.OK });
        return c.text("Created", 201);
      }
      span.recordException(error);
      span.addEvent(events.EVENT_SIGN_UP_FAILURE);
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
    const span = c.get("span");
    const { sub: userId } = c.get("jwtPayload");

    const { data, error } = await userService.call("getActiveSessions", {
      userId,
    });

    if (error != null) {
      span.recordException(error);
      span.addEvent(events.EVENT_GET_SESSIONS_FAILURE);
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
    const span = c.get("span");
    const { sub: userId } = c.get("jwtPayload");
    const { sessionId } = c.req.valid("json");

    const { error } = await userService.call("invalidateSession", {
      sessionId,
      userId,
    });
    if (error != null) {
      span.recordException(error);
      span.addEvent(events.EVENT_INVALIDATE_SESSION_FAILURE);
      return c.json(createUnexpectedError(), 500);
    }

    return c.text("Success", 200);
  },
);

authRouter.post(
  "/logout",
  describeRoute({
    description: "Removes the refresh token cookie",
    responses: {
      200: {
        description: "A successful response",
      },
    },
  }),

  (c) => {
    const span = c.get("span");

    span.addEvent(events.EVENT_LOGOUT);
    setCookie(c, "refreshToken", "", {
      sameSite: "Strict",
      httpOnly: true,
      secure: process.env.NODE_ENV?.toUpperCase() === "PRODUCTION",
      expires: new Date(0),
    });

    return c.text("Success", 200);
  },
);
