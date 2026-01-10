import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useMediaQuery } from "@uidotdev/usehooks";

import { MobileNavigation } from "../../components/mobileNavigation";
import { Navigation } from "../../components/navigation";
import { canAccessPage } from "../../util/auth";

export const Route = createFileRoute("/(auth)")({
  component: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const isDesktop = useMediaQuery("(min-width: 768px)");

    return (
      <div className="bg-muted flex h-dvh w-full flex-col overflow-clip md:flex-row">
        {isDesktop && <Navigation />}
        <div
          className="flex w-full flex-1 flex-col overflow-auto px-4 py-8"
          id="main"
        >
          <Outlet />
        </div>
        {!isDesktop && <MobileNavigation />}
      </div>
    );
  },
  beforeLoad: canAccessPage,
});
