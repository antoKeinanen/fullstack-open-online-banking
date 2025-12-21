import type { JwtVariables } from "hono/jwt";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { logger } from "hono/logger";

import { env } from "./env";
import { authRouter } from "./routes/auth";
import { paymentRouter } from "./routes/payments";
import { userRouter } from "./routes/user";

export interface JwtPayload {
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  sid: string;
}

const app = new Hono<{ Variables: JwtVariables<JwtPayload> }>().basePath(
  "/api",
);
app.use(logger());

app.route("/auth", authRouter);
app.route("/user", userRouter);
app.route("/payment", paymentRouter);

if (process.env.NODE_ENV !== "production")
  app.get("/openapi", openAPIRouteHandler(app, {}));

export default {
  port: env.USER_BFF_PORT,
  fetch: app.fetch,
};
