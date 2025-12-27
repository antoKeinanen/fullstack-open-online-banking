import { promisify } from "util";
import * as grpc from "@grpc/grpc-js";

import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
} from "@repo/protobufs/payment-service";
import { PaymentServiceClient } from "@repo/protobufs/payment-service";

import type { GrpcResponse } from "./types";
import { tryCatch } from "./try-catch";

export class PaymentService {
  private client: PaymentServiceClient;

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
        throw new Error("Failed to connect to grpc");
      }
      console.log("Connected to payment service grpc");
    });
  }

  async createPayment(request: CreatePaymentRequest) {
    const createPayment = promisify(
      this.client.createPayment.bind(this.client),
    );

    return tryCatch(
      createPayment(request),
    ) as GrpcResponse<CreatePaymentResponse>;
  }
}
