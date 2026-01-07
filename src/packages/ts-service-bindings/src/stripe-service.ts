import * as grpc from "@grpc/grpc-js";

import { StripeServiceClient } from "@repo/protobufs/stripe-service";

import { GrpcService } from "./generic-service";

export const StripeService = (address: string) =>
  new GrpcService(StripeServiceClient, address, "stripe-service", {
    credentials: grpc.credentials.createInsecure(),
  });
