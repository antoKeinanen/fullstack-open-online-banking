import type { Context, Next } from "hono";
import { SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("user-bff");

export async function tracingMiddleware(c: Context, next: Next) {
  const span = tracer.startSpan(`${c.req.method} ${c.req.path}`);

  span.setAttributes({
    "http.method": c.req.method,
    "http.url": c.req.url,
    "http.target": c.req.path,
    "http.host": c.req.header("host") ?? "unknown",
    "http.ip": c.req.header("x-forwarded-for") ?? "unknown",
  });

  try {
    await next();
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (err: unknown) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  } finally {
    span.end();
  }
}
