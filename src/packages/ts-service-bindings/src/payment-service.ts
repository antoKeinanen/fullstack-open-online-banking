import * as grpc from "@grpc/grpc-js";

import { PaymentServiceClient } from "@repo/protobufs/payment-service";

import { GrpcService } from "./generic-service";

export const PaymentService = (address: string) =>
  new GrpcService(PaymentServiceClient, address, "payment-service", {
    credentials: grpc.credentials.createInsecure(),
  });
