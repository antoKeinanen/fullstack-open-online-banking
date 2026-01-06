import { loadStripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_USER_CLIENT_STRIPE_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error(
    "Missing VITE_USER_CLIENT_STRIPE_PUBLISHABLE_KEY env variable",
  );
}

export const stripe = loadStripe(publishableKey);
