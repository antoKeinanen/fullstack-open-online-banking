import { redirect } from "@tanstack/react-router";

import { useAuthStore } from "../stores/authStore";

export function canAccessPage() {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated()) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: "/login" });
  }
}
