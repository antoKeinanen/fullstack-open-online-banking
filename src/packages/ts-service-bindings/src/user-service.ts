import * as grpc from "@grpc/grpc-js";
import { context, propagation } from "@opentelemetry/api";

import type {
  CreateUserRequest,
  Empty,
  GetActiveSessionsRequest,
  GetActiveSessionsResponse,
  GetUserByIdRequest,
  GetUserByPhoneNumberRequest,
  GetUserTransfersRequest,
  GetUserTransfersResponse,
  InvalidateSessionRequest,
  OTPAuthenticationRequest,
  RefreshTokenRequest,
  RequestAuthenticationRequest,
  Session,
  User,
} from "@repo/protobufs/user-service";
import { UserServiceClient } from "@repo/protobufs/user-service";

import type { GrpcResponse } from "./types";
import { tryCatch } from "./try-catch";
import { promisifyGrpc } from "./types";

export class UserService {
  private client: UserServiceClient;

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
    this.client = new UserServiceClient(
      address,
      grpc.credentials.createInsecure(),
    );

    console.log("Connecting to user service grpc");
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);
    this.client.waitForReady(deadline, (error) => {
      if (error != undefined) {
        console.error("Failed to connect grpc", error);
        throw new Error("Failed to connect to user service grpc");
      }
      console.log("Connected to user service grpc");
    });
  }

  async invalidateSession(
    request: InvalidateSessionRequest,
  ): GrpcResponse<Empty> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const invalidateSessions = promisifyGrpc<InvalidateSessionRequest, Empty>(
        this.client.invalidateSession.bind(this.client),
      );
      return tryCatch(
        invalidateSessions(request, metadata),
      ) as GrpcResponse<Empty>;
    });
  }

  async getActiveSessions(
    request: GetActiveSessionsRequest,
  ): GrpcResponse<GetActiveSessionsResponse> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const getActiveSessions = promisifyGrpc<
        GetActiveSessionsRequest,
        GetActiveSessionsResponse
      >(this.client.getActiveSessions.bind(this.client));
      return tryCatch(
        getActiveSessions(request, metadata),
      ) as GrpcResponse<GetActiveSessionsResponse>;
    });
  }

  async refreshToken(request: RefreshTokenRequest): GrpcResponse<Session> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const refreshToken = promisifyGrpc<RefreshTokenRequest, Session>(
        this.client.refreshToken.bind(this.client),
      );
      return tryCatch(refreshToken(request, metadata)) as GrpcResponse<Session>;
    });
  }

  async authenticateWithOTP(
    request: OTPAuthenticationRequest,
  ): GrpcResponse<Session> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const authenticateWithOTP = promisifyGrpc<
        OTPAuthenticationRequest,
        Session
      >(this.client.authenticateWithOtp.bind(this.client));
      return tryCatch(
        authenticateWithOTP(request, metadata),
      ) as GrpcResponse<Session>;
    });
  }

  async requestAuthentication(
    request: RequestAuthenticationRequest,
  ): GrpcResponse<Empty> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const requestAuthentication = promisifyGrpc<
        RequestAuthenticationRequest,
        Empty
      >(this.client.requestAuthentication.bind(this.client));
      return tryCatch(
        requestAuthentication(request, metadata),
      ) as GrpcResponse<Empty>;
    });
  }

  async createUser(request: CreateUserRequest): GrpcResponse<User> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const createUser = promisifyGrpc<CreateUserRequest, User>(
        this.client.createUser.bind(this.client),
      );
      return tryCatch(createUser(request, metadata)) as GrpcResponse<User>;
    });
  }

  async getUserById(request: GetUserByIdRequest): GrpcResponse<User> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const getUserById = promisifyGrpc<GetUserByIdRequest, User>(
        this.client.getUserById.bind(this.client),
      );
      return tryCatch(getUserById(request, metadata)) as GrpcResponse<User>;
    });
  }

  async getUserByPhoneNumber(
    request: GetUserByPhoneNumberRequest,
  ): GrpcResponse<User> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const getUserByPhoneNumber = promisifyGrpc<
        GetUserByPhoneNumberRequest,
        User
      >(this.client.getUserByPhoneNumber.bind(this.client));
      return tryCatch(
        getUserByPhoneNumber(request, metadata),
      ) as GrpcResponse<User>;
    });
  }

  async getUserTransfers(
    request: GetUserTransfersRequest,
  ): GrpcResponse<GetUserTransfersResponse> {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();
      const getUserTransfers = promisifyGrpc<
        GetUserTransfersRequest,
        GetUserTransfersResponse
      >(this.client.getUserTransfers.bind(this.client));

      return tryCatch(
        getUserTransfers(request, metadata),
      ) as GrpcResponse<GetUserTransfersResponse>;
    });
  }
}
