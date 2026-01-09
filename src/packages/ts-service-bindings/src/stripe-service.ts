import * as grpc from "@grpc/grpc-js";

import { StripeServiceClient } from "@repo/protobufs/stripe-service";

import { GrpcService } from "./generic-service";

export const StripeService = async (address: string) =>
  GrpcService.create(StripeServiceClient, address, "stripe-service", {
    credentials: grpc.credentials.createInsecure(),
  });
