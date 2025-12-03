import type { JwtVariables } from "hono/jwt";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { logger } from "hono/logger";

import { env } from "./env";
import { authRouter } from "./routes/auth";

interface JwtPayload {
  iss: string;
  sub: string;
  exp: number;
  iat: number;
}

const app = new Hono<{ Variables: JwtVariables<JwtPayload> }>().basePath(
  "/api",
);
app.use(logger());

app.route("/auth", authRouter);

export default {
  port: env.USER_BFF_PORT,
  fetch: app.fetch,
};
