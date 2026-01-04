import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2Icon } from "lucide-react";

import { Button } from "@repo/web-ui/button";
import { Card } from "@repo/web-ui/card";

export const Route = createFileRoute("/(auth)/success")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="m-auto max-w-sm self-center pt-8 md:max-w-md">
      <Card className="flex flex-col items-center justify-center gap-8 overflow-clip px-6">
        <CheckCircle2Icon size={128} className="text-green-500" />
        <div className="flex flex-col gap-2">
          <h1 className="text-center text-lg font-semibold">
            Transfer completed successfully
          </h1>
          <p className="text-muted-foreground text-center text-sm">
            Funds will appear as pending and settle to your account within 1-7
            business days, or instantly depending on your payment method.
          </p>
        </div>
        <Link to="/dashboard">
          <Button>Return to the dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
