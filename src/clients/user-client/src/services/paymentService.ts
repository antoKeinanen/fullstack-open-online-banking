import z from "zod";

import type { CreatePaymentRequest } from "@repo/validators/payment";

import * as api from "../util/api";

export async function createPayment(request: CreatePaymentRequest) {
  return api.post("/api/payment/transfer", z.string(), request);
}
