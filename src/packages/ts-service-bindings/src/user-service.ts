import * as grpc from "@grpc/grpc-js";

import { UserServiceClient } from "@repo/protobufs/user-service";

import { GrpcService } from "./generic-service";

export const UserService = async (address: string) =>
  GrpcService.create(UserServiceClient, address, "user-service", {
    credentials: grpc.credentials.createInsecure(),
  });
