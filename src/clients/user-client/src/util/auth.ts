import { redirect } from "@tanstack/react-router";

import { useAuthStore } from "../stores/authStore";
import { refreshToken } from "./api";

export async function canAccessPage() {
  const { isAuthenticated } = useAuthStore.getState();

  if (isAuthenticated()) {
    return;
  }

  try {
    await refreshToken(null);
  } catch {
    useAuthStore.getState().clearSession();
  }

  if (!useAuthStore.getState().isAuthenticated()) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: "/login" });
  }
}
