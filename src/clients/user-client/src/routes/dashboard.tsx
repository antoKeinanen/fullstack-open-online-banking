import { createFileRoute } from "@tanstack/react-router";
import {
  BanknoteArrowDownIcon,
  BanknoteArrowUpIcon,
  LockIcon,
  WalletIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/web-ui/avatar";
import { Button } from "@repo/web-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/web-ui/card";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function TransactionCard() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src="TODO" />
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
          <div>
            <p>Example Payment</p>
            <p className="text-muted-foreground -mt-2 text-sm">
              19.12 | 28.11.2025
            </p>
          </div>
        </div>
        <p className="text-lg">123.45€</p>
      </CardContent>
    </Card>
  );
}

function RecommendedUserCard() {
  return (
    <div className="flex w-min flex-col items-center justify-center text-center">
      <Avatar className="h-12 w-12">
        <AvatarImage src="TODO" />
        <AvatarFallback>AK</AvatarFallback>
      </Avatar>
      <p className="leading-5">Example User</p>
    </div>
  );
}

function RouteComponent() {
  return (
    <main className="w-full space-y-4">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src="TODO" />
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-muted-foreground -mb-2 text-sm">Good evening</p>
            <p className="text-foreground">Anto Keinänen</p>
          </div>
        </div>
        <Button variant="outline">
          <LockIcon /> Close
        </Button>
      </div>

      <Card className="w-full gap-2">
        <CardHeader>
          <CardTitle className="text-xl">12 345.67€</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 grid-rows-2 gap-2">
            <Button className="col-span-2">
              <WalletIcon />
              Deposit
            </Button>
            <Button variant="secondary">
              <BanknoteArrowUpIcon /> Send
            </Button>
            <Button variant="secondary">
              <BanknoteArrowDownIcon /> Request
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-1.5">
        <div className="text-foreground flex items-center justify-between">
          <p>Recent transactions</p>
          <Button variant="link">View all</Button>
        </div>

        {[0, 1, 2].map((_, i) => (
          <TransactionCard key={`transaction-card-${i}`} />
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 grid-rows-2 items-center justify-items-center gap-2">
          {[0, 1, 2, 3, 4, 5].map((_, i) => (
            <RecommendedUserCard key={`recommended-user-${i}`} />
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
