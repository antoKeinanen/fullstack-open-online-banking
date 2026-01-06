import type Stripe from "stripe";

export function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer,
) {
  return typeof customer == "string" ? customer : customer.id;
}
