import * as grpc from "@grpc/grpc-js";
import { context, propagation } from "@opentelemetry/api";

import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
} from "@repo/protobufs/payment-service";
import { PaymentServiceClient } from "@repo/protobufs/payment-service";

import type { GrpcResponse } from "./types";
import { tryCatch } from "./try-catch";
import { promisifyGrpc } from "./types";

export class PaymentService {
  private client: PaymentServiceClient;

  private injectContext(): grpc.Metadata {
    const metadata = new grpc.Metadata();
    const carrier: Record<string, string> = {};

    propagation.inject(context.active(), carrier);

    Object.entries(carrier).forEach(([key, value]) => {
      metadata.set(key, value);
    });

    return metadata;
  }

  constructor(address: string) {
    this.client = new PaymentServiceClient(
      address,
      grpc.credentials.createInsecure(),
    );

    console.log("Connecting to payment service grpc");
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);
    this.client.waitForReady(deadline, (error) => {
      if (error !== undefined) {
        console.error("Failed to connect grpc", error);
        throw new Error("Failed to connect to payment service grpc");
      }
      console.log("Connected to payment service grpc");
    });
  }

  async createPayment(request: CreatePaymentRequest) {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const createPayment = promisifyGrpc<
        CreatePaymentRequest,
        CreatePaymentResponse
      >(this.client.createPayment.bind(this.client));

      return tryCatch(
        createPayment(request, metadata),
      ) as GrpcResponse<CreatePaymentResponse>;
    });
  }
}
