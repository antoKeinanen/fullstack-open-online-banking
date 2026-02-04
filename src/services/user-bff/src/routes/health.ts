import { grpc } from "@repo/service-bindings/grpc";
import { Hono } from "hono";

import type { Env } from "../index";
import { redisClient } from "../services/idempotencyService";
import { paymentService } from "../services/paymentService";
import { stripeService, } from "../services/stripeService";
import { userService } from "../services/userService";

interface CheckResult {
  status: "ok" | "unhealthy";
  message?: string;
}

interface HealthResponse {
  status: "ok" | "unhealthy";
  checks?: Record<string, CheckResult>;
}

// Track startup completion
let isReady = false;

export function setReady(ready: boolean): void {
  isReady = ready;
}

async function checkRedis(): Promise<CheckResult> {
  try {
    const result = await redisClient.send("PING", []);
    if (result === "PONG") {
      return { status: "ok" };
    }
    return { status: "unhealthy", message: `Unexpected PING response: ${result}` };
  } catch (error) {
    return {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Redis connection failed",
    };
  }
}

function checkGrpcService(
  serviceName: string,
  client: grpc.Client
): CheckResult {
  try {
    const channel = client.getChannel();
    const state = channel.getConnectivityState(false);

    switch (state) {
      case grpc.connectivityState.READY:
        return { status: "ok" };
      case grpc.connectivityState.IDLE:
        // Trigger connection for next check
        channel.getConnectivityState(true);
        return { status: "ok" };
      case grpc.connectivityState.CONNECTING:
        return { status: "ok" };
      case grpc.connectivityState.TRANSIENT_FAILURE:
        return {
          status: "unhealthy",
          message: `${serviceName} gRPC connection in transient failure state`,
        };
      case grpc.connectivityState.SHUTDOWN:
        return {
          status: "unhealthy",
          message: `${serviceName} gRPC connection is shutdown`,
        };
      default:
        return {
          status: "unhealthy",
          message: `${serviceName} gRPC connection in unknown state: ${state}`,
        };
    }
  } catch (error) {
    return {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "gRPC check failed",
    };
  }
}

export const healthRouter = new Hono<Env>();

// Liveness probe - just check if the process is alive
healthRouter.get("/live", (c) => {
  return c.json<HealthResponse>({ status: "ok" });
});

// Readiness probe - check all dependencies
healthRouter.get("/ready", async (c) => {
  const checks: Record<string, CheckResult> = {};
  let allHealthy = true;

  // Check Redis
  const redisCheck = await checkRedis();
  checks["redis"] = redisCheck;
  if (redisCheck.status === "unhealthy") {
    allHealthy = false;
  }

  // Check gRPC services
  const userServiceCheck = checkGrpcService("user-service", userService.getClient());
  checks["user-service-grpc"] = userServiceCheck;
  if (userServiceCheck.status === "unhealthy") {
    allHealthy = false;
  }

  const paymentServiceCheck = checkGrpcService("payment-service", paymentService.getClient());
  checks["payment-service-grpc"] = paymentServiceCheck;
  if (paymentServiceCheck.status === "unhealthy") {
    allHealthy = false;
  }

  const stripeServiceCheck = checkGrpcService("stripe-service", stripeService.getClient());
  checks["stripe-service-grpc"] = stripeServiceCheck;
  if (stripeServiceCheck.status === "unhealthy") {
    allHealthy = false;
  }

  const response: HealthResponse = {
    status: allHealthy ? "ok" : "unhealthy",
    checks,
  };

  return c.json(response, allHealthy ? 200 : 503);
});

// Startup probe - check if initial connections are established
healthRouter.get("/startup", (c) => {
  if (isReady) {
    return c.json<HealthResponse>({ status: "ok" });
  }
  return c.json<HealthResponse>({ status: "unhealthy" }, 503);
});
