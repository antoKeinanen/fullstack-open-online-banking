import { promisify } from "util";
import * as grpc from "@grpc/grpc-js";

import type {
  CreateUserRequest,
  Empty,
  GetActiveSessionsRequest,
  GetActiveSessionsResponse,
  GetUserByIdRequest,
  GetUserByPhoneNumberRequest,
  InvalidateSessionRequest,
  OTPAuthenticationRequest,
  RefreshTokenRequest,
  RequestAuthenticationRequest,
  Session,
  User,
} from "@repo/protobufs/user-service";
import { UserServiceClient } from "@repo/protobufs/user-service";

import type { Result } from "./try-catch";
import type { GrpcResponse } from "./types";
import { tryCatch } from "./try-catch";

export class UserService {
  private client: UserServiceClient;

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
        throw new Error("Failed to connect to grpc");
      }
      console.log("Connected to user service grpc");
    });
  }

  async invalidateSession(
    request: InvalidateSessionRequest,
  ): GrpcResponse<Empty> {
    const invalidateSessions = promisify(
      this.client.invalidateSession.bind(this.client),
    );
    return tryCatch(invalidateSessions(request)) as GrpcResponse<Empty>;
  }

  async getActiveSessions(
    request: GetActiveSessionsRequest,
  ): GrpcResponse<GetActiveSessionsResponse> {
    const getActiveSessions = promisify(
      this.client.getActiveSessions.bind(this.client),
    );
    return tryCatch(
      getActiveSessions(request),
    ) as GrpcResponse<GetActiveSessionsResponse>;
  }

  async refreshToken(request: RefreshTokenRequest): GrpcResponse<Session> {
    const refreshToken = promisify(this.client.refreshToken.bind(this.client));
    return tryCatch(refreshToken(request)) as GrpcResponse<Session>;
  }

  async authenticateWithOTP(
    request: OTPAuthenticationRequest,
  ): GrpcResponse<Session> {
    const authenticateWithOTP = promisify(
      this.client.authenticateWithOtp.bind(this.client),
    );
    return tryCatch(authenticateWithOTP(request)) as GrpcResponse<Session>;
  }

  async requestAuthentication(
    request: RequestAuthenticationRequest,
  ): GrpcResponse<Empty> {
    const requestAuthentication = promisify(
      this.client.requestAuthentication.bind(this.client),
    );
    return tryCatch(requestAuthentication(request)) as Promise<
      Result<Empty, grpc.ServiceError>
    >;
  }

  async createUser(request: CreateUserRequest): GrpcResponse<User> {
    const createUser = promisify(this.client.createUser.bind(this.client));
    return tryCatch(createUser(request)) as Promise<
      Result<User, grpc.ServiceError>
    >;
  }

  async getUserById(request: GetUserByIdRequest): GrpcResponse<User> {
    const getUserById = promisify(this.client.getUserById.bind(this.client));
    return tryCatch(getUserById(request)) as Promise<
      Result<User, grpc.ServiceError>
    >;
  }

  async getUserByPhoneNumber(
    request: GetUserByPhoneNumberRequest,
  ): GrpcResponse<User> {
    const getUserByPhoneNumber = promisify(
      this.client.getUserByPhoneNumber.bind(this.client),
    );
    return tryCatch(getUserByPhoneNumber(request)) as GrpcResponse<User>;
  }
}
