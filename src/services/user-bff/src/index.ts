import { Hono } from "hono";
import { logger } from "hono/logger";

import { env } from "./env";

const app = new Hono().basePath("/api");
app.use(logger());

export default {
  port: env.USER_BFF_PORT,
  fetch: app.fetch,
};
