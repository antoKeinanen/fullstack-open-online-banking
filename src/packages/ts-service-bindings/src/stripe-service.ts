import { promisify } from "util";
import * as grpc from "@grpc/grpc-js";

import type {
  CreateAndPostTransferRequest,
  CreatePendingTransferRequest,
  Empty,
  GetPendingTransferRequest,
  GetPendingTransferResponse,
  GetStripeCustomerIdRequest,
  GetStripeCustomerIdResponse,
  GetUserIdRequest,
  GetUserIdResponse,
  PostPendingTransferRequest,
  VoidPendingTransferRequest,
} from "@repo/protobufs/stripe-service";
import { StripeServiceClient } from "@repo/protobufs/stripe-service";

import type { GrpcResponse } from "./types";
import { tryCatch } from "./try-catch";

export class StripeService {
  private client: StripeServiceClient;

  constructor(address: string) {
    this.client = new StripeServiceClient(
      address,
      grpc.credentials.createInsecure(),
    );

    console.log("Connecting to stripe service grpc");
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);
    this.client.waitForReady(deadline, (error) => {
      if (error != undefined) {
        console.error("Failed to connect grpc", error);
        throw new Error("Failed to connect to grpc");
      }
      console.log("Connected to stripe service grpc");
    });
  }

  async getStripeCustomerId(
    request: GetStripeCustomerIdRequest,
  ): GrpcResponse<GetStripeCustomerIdResponse> {
    const getStripeCustomerId = promisify(
      this.client.getStripeCustomerId.bind(this.client),
    );
    return tryCatch(
      getStripeCustomerId(request),
    ) as GrpcResponse<GetStripeCustomerIdResponse>;
  }

  async setStripeCustomerId(request: {
    userId: string;
    stripeCustomerId: string;
  }): GrpcResponse<Empty> {
    const setStripeCustomerId = promisify(
      this.client.setStripeCustomerId.bind(this.client),
    );
    return tryCatch(setStripeCustomerId(request)) as GrpcResponse<Empty>;
  }

  async getPendingTransfer(
    request: GetPendingTransferRequest,
  ): GrpcResponse<GetPendingTransferResponse> {
    const getPendingTransfer = promisify(
      this.client.getPendingTransfer.bind(this.client),
    );
    return tryCatch(
      getPendingTransfer(request),
    ) as GrpcResponse<GetPendingTransferResponse>;
  }
  async postPendingTransfer(
    request: PostPendingTransferRequest,
  ): GrpcResponse<Empty> {
    const postPendingTransfer = promisify(
      this.client.postPendingTransfer.bind(this.client),
    );
    return tryCatch(postPendingTransfer(request)) as GrpcResponse<Empty>;
  }

  async createAndPostTransfer(
    request: CreateAndPostTransferRequest,
  ): GrpcResponse<Empty> {
    const createAndPostTransfer = promisify(
      this.client.createAndPostTransfer.bind(this.client),
    );
    return tryCatch(createAndPostTransfer(request)) as GrpcResponse<Empty>;
  }

  async voidPendingTransfer(
    request: VoidPendingTransferRequest,
  ): GrpcResponse<Empty> {
    const voidPendingTransfer = promisify(
      this.client.voidPendingTransfer.bind(this.client),
    );
    return tryCatch(voidPendingTransfer(request)) as GrpcResponse<Empty>;
  }

  async getUserId(request: GetUserIdRequest): GrpcResponse<GetUserIdResponse> {
    const getUserId = promisify(this.client.getUserId.bind(this.client));
    return tryCatch(getUserId(request)) as GrpcResponse<GetUserIdResponse>;
  }

  async createPendingTransfer(
    request: CreatePendingTransferRequest,
  ): GrpcResponse<Empty> {
    const createPendingTransfer = promisify(
      this.client.createPendingTransfer.bind(this.client),
    );
    return tryCatch(createPendingTransfer(request)) as GrpcResponse<Empty>;
  }
}
