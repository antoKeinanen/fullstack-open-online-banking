import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Toaster } from "@repo/web-ui/sonner";

const queryClient = new QueryClient();

const RootLayout = () => (
  <QueryClientProvider client={queryClient}>
    <Outlet />

    <TanStackRouterDevtools position="top-right" />
    <Toaster richColors position="top-center" />
  </QueryClientProvider>
);

export const Route = createRootRoute({ component: RootLayout });
