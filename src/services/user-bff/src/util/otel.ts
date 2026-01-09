import { propagation } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { GrpcInstrumentation } from "@opentelemetry/instrumentation-grpc";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

import { env } from "../env";

const traceExporter = new OTLPTraceExporter({
  url: env.USER_BFF_OTEL_EXPORTER_OTLP_ENDPOINT,
});

propagation.setGlobalPropagator(new W3CTraceContextPropagator());

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "user-bff",
  }),
  spanProcessors: [new BatchSpanProcessor(traceExporter)],
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-grpc": {
        enabled: true,
      },
    }),
    new GrpcInstrumentation({
      enabled: true,
    }),
  ],
});

sdk.start();

process.on("SIGTERM", () => {
  void sdk.shutdown().finally(() => process.exit());
});
