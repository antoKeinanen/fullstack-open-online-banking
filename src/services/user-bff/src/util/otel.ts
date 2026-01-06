import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

import { env } from "../env";

const traceExporter = new OTLPTraceExporter({
  url: env.USER_BFF_OTEL_EXPORTER_OTLP_ENDPOINT,
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "user-bff",
  }),
  spanProcessors: [
    new BatchSpanProcessor(traceExporter),
    new BatchSpanProcessor(new ConsoleSpanExporter()),
  ],
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on("SIGTERM", () => {
  void sdk.shutdown().finally(() => process.exit());
});
