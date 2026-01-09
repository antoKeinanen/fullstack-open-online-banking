import { Link, useLocation } from "@tanstack/react-router";

import { cn } from "@repo/web-ui";

import { navigationItems } from "./navigation";

export function MobileNavigation() {
  const { pathname } = useLocation();
  return (
    <nav className="bg-background border-border flex h-20 w-dvw justify-evenly border">
      {navigationItems.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          aria-current={ item.urlRegex.test(pathname) ? "page" : undefined}
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
