import type { PersistStorage } from "zustand/middleware";
import superjson from "superjson";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Session } from "@repo/validators/user";

export interface AuthStore {
  session: Session | null;
  setSession: (session: Session) => void;
  isAuthenticated: () => boolean;
  clearSession: () => void;
}

const storage: PersistStorage<AuthStore> = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    return superjson.parse(str);
  },
  setItem: (name, value) => {
    localStorage.setItem(name, superjson.stringify(value));
  },
  removeItem: (name) => localStorage.removeItem(name),
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
      isAuthenticated: () => {
        const { session } = get();
        if (session == null) {
          return false;
        }

        const expires = new Date(session.accessTokenExpires).getTime();
        const now = Date.now();
        if (now > expires) {
          return false;
        }

        return true;
      },
    }),
    { name: "auth-store", version: 0, storage },
  ),
);
