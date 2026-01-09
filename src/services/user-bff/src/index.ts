import "./util/otel";

import type { Span } from "@opentelemetry/api";
import type { JwtVariables } from "hono/jwt";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { logger } from "hono/logger";

import { env } from "./env";
import { authRouter } from "./routes/auth";
import { paymentRouter } from "./routes/payments";
import { stripeRouter } from "./routes/stripe";
import { userRouter } from "./routes/user";
import { tracingMiddleware } from "./util/traceMiddleware";

export interface JwtPayload {
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  sid: string;
}

export interface Env {
  Variables: {
    span: Span;
  } & JwtVariables<JwtPayload>;
}

const app = new Hono<Env>().basePath("/api");
app.use(logger());

const instrumentationConfig: Parameters<
  typeof httpInstrumentationMiddleware
>[0] = {
  serviceName: "user-bff",
  captureRequestHeaders: [
    "user-agent",
    "content-type",
    "x-request-id",
    "x-forwarded-for",
    "content-length",
  ],
};

app.use(httpInstrumentationMiddleware(instrumentationConfig));
app.use("*", tracingMiddleware);

app.route("/auth", authRouter);
app.route("/user", userRouter);
app.route("/payment", paymentRouter);
app.route("/stripe", stripeRouter);

if (process.env.NODE_ENV !== "production")
  app.get("/openapi", openAPIRouteHandler(app, {}));

export default {
  port: env.USER_BFF_PORT,
  fetch: app.fetch,
};
