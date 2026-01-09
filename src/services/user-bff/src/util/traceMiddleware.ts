import type { Context, Next } from "hono";
import { trace } from "@opentelemetry/api";
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from "@opentelemetry/semantic-conventions/incubating";

import type { Env } from "..";
import { env } from "../env";

const tracer = trace.getTracer("user-bff");

export async function tracingMiddleware(c: Context<Env>, next: Next) {
  const span = tracer.startSpan(`${c.req.method} ${c.req.path}`);

  span.setAttribute(ATTR_DEPLOYMENT_ENVIRONMENT_NAME, env.NODE_ENV);

  c.set("span", span);

  await next();
}
