import { Hono } from "hono";
import { logger } from "hono/logger";

import { env } from "./env";
import { authRouter } from "./routes/auth";

const app = new Hono().basePath("/api");
app.use(logger());

app.route("/auth", authRouter);

export default {
  port: env.USER_BFF_PORT,
  fetch: app.fetch,
};
