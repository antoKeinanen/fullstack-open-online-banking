import type { Context, Next } from "hono";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";

import type { Env } from "..";

const tracer = trace.getTracer("user-bff");

export async function tracingMiddleware(c: Context<Env>, next: Next) {
  const span = tracer.startSpan(`${c.req.method} ${c.req.path}`);

  span.setAttributes({
    "http.method": c.req.method,
    "http.url": c.req.url,
    "http.target": c.req.path,
    "http.host": c.req.header("host") ?? "unknown",
    "http.ip": c.req.header("x-forwarded-for") ?? "unknown",
  });

  c.set("span", span);

  return await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      await next();

      const status = c.res.status;
      span.setAttribute("http.status", status);

      if (c.res.ok) {
        span.setStatus({ code: SpanStatusCode.OK });
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
