import type { IconName } from "lucide-react/dynamic";
import { Link, useLocation } from "@tanstack/react-router";
import { DynamicIcon } from "lucide-react/dynamic";

import { cn } from "@repo/web-ui";

interface MobileNavigationItem {
  label: string;
  id: string;
  urlRegex: RegExp;
  to: string;
  icon: IconName;
}

const mobileNavigationItems: MobileNavigationItem[] = [
  {
    label: "Home",
    id: "home",
    urlRegex: /^\/dashboard(\/)?$/,
    to: "/dashboard",
    icon: "home",
  },
  {
    label: "Transactions",
    id: "transactions",
    urlRegex: /^\/transactions(\/)?$/,
    to: "/transactions",
    icon: "arrow-left-right",
  },
  {
    label: "Me",
    id: "me",
    urlRegex: /^\/me(\/)?$/,
    to: "/me",
    icon: "user",
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
          <DynamicIcon name={item.icon} size={32} />
          <p>{item.label}</p>
        </Link>
      ))}
    </nav>
  );
}
