import { PaymentService } from "@repo/service-bindings/payment-service";

import { env } from "../env";

export const paymentService = await PaymentService(
  env.USER_BFF_PAYMENT_SERVICE_URL,
);
