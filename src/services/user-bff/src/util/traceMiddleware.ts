import type { Context, Next } from "hono";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_REQUEST_SIZE,
  ATTR_HTTP_RESPONSE_SIZE,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_URL_FULL,
  ATTR_URL_PATH,
} from "@opentelemetry/semantic-conventions/incubating";

import type { Env } from "..";
import { env } from "../env";

const tracer = trace.getTracer("user-bff");

export async function tracingMiddleware(c: Context<Env>, next: Next) {
  const span = tracer.startSpan(`${c.req.method} ${c.req.path}`);

  span.setAttributes({
    [ATTR_HTTP_REQUEST_METHOD]: c.req.method,
    [ATTR_URL_FULL]: c.req.url,
    [ATTR_URL_PATH]: c.req.path,
    "http.request.header.host": c.req.header("host") ?? "unknown",
    "http.request.header.x-forwarded-for":
      c.req.header("x-forwarded-for") ?? "unknown",
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: env.NODE_ENV,
    [ATTR_HTTP_REQUEST_SIZE]: c.req.header("content-length") ?? "0",
  });

  c.set("span", span);

  return await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      await next();

      const status = c.res.status;
      span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, status);
      span.setAttribute(
        ATTR_HTTP_RESPONSE_SIZE,
        c.res.headers.get("content-length") ?? "0",
      );

      if (c.res.ok) {
        span.setStatus({ code: SpanStatusCode.OK });
      } else {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: c.res.statusText,
        });
      }
    } catch (err: unknown) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    } finally {
      span.end();
    }
  });
}
