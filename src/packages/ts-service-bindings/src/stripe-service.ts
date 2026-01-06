import * as grpc from "@grpc/grpc-js";
import { context, propagation } from "@opentelemetry/api";

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
import { promisifyGrpc } from "./types";

export class StripeService {
  private client: StripeServiceClient;

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
        throw new Error("Failed to connect to stripe service grpc");
      }
      console.log("Connected to stripe service grpc");
    });
  }

  async getStripeCustomerId(
    request: GetStripeCustomerIdRequest,
  ): GrpcResponse<GetStripeCustomerIdResponse> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const getStripeCustomerId = promisifyGrpc<
        GetStripeCustomerIdRequest,
        GetStripeCustomerIdResponse
      >(this.client.getStripeCustomerId.bind(this.client));
      return tryCatch(
        getStripeCustomerId(request, metadata),
      ) as GrpcResponse<GetStripeCustomerIdResponse>;
    });
  }

  async setStripeCustomerId(request: {
    userId: string;
    stripeCustomerId: string;
  }): GrpcResponse<Empty> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const setStripeCustomerId = promisifyGrpc<
        { userId: string; stripeCustomerId: string },
        Empty
      >(this.client.setStripeCustomerId.bind(this.client));
      return tryCatch(
        setStripeCustomerId(request, metadata),
      ) as GrpcResponse<Empty>;
    });
  }

  async getPendingTransfer(
    request: GetPendingTransferRequest,
  ): GrpcResponse<GetPendingTransferResponse> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const getPendingTransfer = promisifyGrpc<
        GetPendingTransferRequest,
        GetPendingTransferResponse
      >(this.client.getPendingTransfer.bind(this.client));
      return tryCatch(
        getPendingTransfer(request, metadata),
      ) as GrpcResponse<GetPendingTransferResponse>;
    });
  }
  async postPendingTransfer(
    request: PostPendingTransferRequest,
  ): GrpcResponse<Empty> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const postPendingTransfer = promisifyGrpc<
        PostPendingTransferRequest,
        Empty
      >(this.client.postPendingTransfer.bind(this.client));
      return tryCatch(
        postPendingTransfer(request, metadata),
      ) as GrpcResponse<Empty>;
    });
  }

  async createAndPostTransfer(
    request: CreateAndPostTransferRequest,
  ): GrpcResponse<Empty> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const createAndPostTransfer = promisifyGrpc<
        CreateAndPostTransferRequest,
        Empty
      >(this.client.createAndPostTransfer.bind(this.client));
      return tryCatch(
        createAndPostTransfer(request, metadata),
      ) as GrpcResponse<Empty>;
    });
  }

  async voidPendingTransfer(
    request: VoidPendingTransferRequest,
  ): GrpcResponse<Empty> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const voidPendingTransfer = promisifyGrpc<
        VoidPendingTransferRequest,
        Empty
      >(this.client.voidPendingTransfer.bind(this.client));
      return tryCatch(
        voidPendingTransfer(request, metadata),
      ) as GrpcResponse<Empty>;
    });
  }

  async getUserId(request: GetUserIdRequest): GrpcResponse<GetUserIdResponse> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const getUserId = promisifyGrpc<GetUserIdRequest, GetUserIdResponse>(
        this.client.getUserId.bind(this.client),
      );
      return tryCatch(
        getUserId(request, metadata),
      ) as GrpcResponse<GetUserIdResponse>;
    });
  }

  async createPendingTransfer(
    request: CreatePendingTransferRequest,
  ): GrpcResponse<Empty> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const createPendingTransfer = promisifyGrpc<
        CreatePendingTransferRequest,
        Empty
      >(this.client.createPendingTransfer.bind(this.client));
      return tryCatch(
        createPendingTransfer(request, metadata),
      ) as GrpcResponse<Empty>;
    });
  }
}
