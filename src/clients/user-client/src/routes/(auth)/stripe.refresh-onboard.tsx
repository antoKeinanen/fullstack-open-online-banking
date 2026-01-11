import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@repo/web-ui/button";
import { Card } from "@repo/web-ui/card";
import { Spinner } from "@repo/web-ui/spinner";

import { getStripeOnboardingUrl } from "../../services/stripeService";

export const Route = createFileRoute("/(auth)/stripe/refresh-onboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const onboardUrlQuery = useQuery({
    queryKey: ["onboardUrl"],
    queryFn: getStripeOnboardingUrl,
  });

  if (onboardUrlQuery.isSuccess) {
    window.location.replace(onboardUrlQuery.data.url);
  }

  return (
    <div className="m-auto max-w-sm self-center pt-8 md:max-w-md">
      <Card className="flex flex-col items-center justify-center gap-8 overflow-clip px-6">
        <Spinner className="text-primary h-32 w-32" />
        <div className="flex flex-col gap-2">
          <h1 className="text-center text-lg font-semibold">
            Redirecting you to Stripe onboarding
          </h1>
          <p className="text-muted-foreground text-center text-sm">
            To withdraw funds from your account you need to fill out some
            information. You will be redirected shortly.
          </p>
        </div>
        <Link to="/dashboard">
          <Button variant="outline">Cancel</Button>
        </Link>
      </Card>
    </div>
  );
}
