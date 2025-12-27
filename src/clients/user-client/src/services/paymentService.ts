import z from "zod";

import type { CreatePaymentApiRequest } from "@repo/validators/payment";

import * as api from "../util/api";

export async function createPayment(request: CreatePaymentApiRequest) {
  return api.post("/api/payment/transfer", z.string(), request);
}
