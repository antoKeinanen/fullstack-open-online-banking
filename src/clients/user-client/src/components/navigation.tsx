import type { ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
  ArrowLeftRightIcon,
  HomeIcon,
  LogOutIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@repo/web-ui";

import { logOut } from "../services/authService";
import { useAuthStore } from "../stores/authStore";

const ICON_SIZE = 32 as const;

export interface NavigationItem {
  label: string;
  id: string;
  urlRegex: RegExp;
  to: string;
  icon: ReactNode;
}

export const navigationItems: NavigationItem[] = [
  {
    label: "Home",
    id: "home",
    urlRegex: /^\/dashboard(\/)?$/,
    to: "/dashboard",
    icon: <HomeIcon size={ICON_SIZE} />,
  },
  {
    label: "Transfers",
    id: "transfers",
    urlRegex: /^\/transfers(\/)?$/,
    to: "/transfers",
    icon: <ArrowLeftRightIcon size={ICON_SIZE} />,
  },
  {
    label: "Me",
    id: "me",
    urlRegex: /^\/me(\/)?$/,
    to: "/me",
    icon: <UserIcon size={ICON_SIZE} />,
  },
];

export function Navigation() {
  const { pathname } = useLocation();
  const { clearSession } = useAuthStore();
  const { navigate } = useRouter();

  const logOutMutation = useMutation({
    mutationKey: ["logout"],
    mutationFn: logOut,
    onSuccess: async () => {
      clearSession();
      await navigate({ to: "/login", replace: true });
    },
    onError: () => {
      toast.error("Failed to log out. Try again later");
    },
  });

  return (
    <div className="h-screen w-24 py-6">
      <div className="bg-card border-border flex h-full flex-col items-center justify-between rounded-r-xl border py-4">
        <div className="space-y-5">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              aria-current={item.urlRegex.test(pathname) ? "page" : undefined}
              className={cn(
                "text-foreground hover:text-primary/50 flex flex-col items-center justify-center",
                {
                  "text-primary font-semibold": item.urlRegex.test(pathname),
                },
              )}
            >
              {item.icon}
              <p>{item.label}</p>
            </Link>
          ))}
        </div>
        <div>
          <button
            onClick={() => logOutMutation.mutate()}
            disabled={logOutMutation.isPending}
            className="text-foreground hover:text-primary/50 flex flex-col items-center justify-center"
            type="button"
          >
            <LogOutIcon size={ICON_SIZE} />
            <p>Log out</p>
          </button>
        </div>
      </div>
    </div>
  );
}
