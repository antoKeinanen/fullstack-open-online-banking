import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeftRightIcon, HomeIcon, UserIcon } from "lucide-react";

import { cn } from "@repo/web-ui";

const ICON_SIZE = 32 as const;

interface MobileNavigationItem {
  label: string;
  id: string;
  urlRegex: RegExp;
  to: string;
  icon: ReactNode;
}

const mobileNavigationItems: MobileNavigationItem[] = [
  {
    label: "Home",
    id: "home",
    urlRegex: /^\/dashboard(\/)?$/,
    to: "/dashboard",
    icon: <HomeIcon size={ICON_SIZE} />,
  },
  {
    label: "Transactions",
    id: "transactions",
    urlRegex: /^\/transactions(\/)?$/,
    to: "/transactions",
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

export function MobileNavigation() {
  const { pathname } = useLocation();
  return (
    <nav className="bg-background border-border flex h-20 w-dvw justify-evenly border">
      {mobileNavigationItems.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          className={cn(
            "text-foreground flex flex-col items-center justify-center",
            {
              "text-primary font-semibold": item.urlRegex.test(pathname),
            },
          )}
        >
          {item.icon}
          <p>{item.label}</p>
        </Link>
      ))}
    </nav>
  );
}
