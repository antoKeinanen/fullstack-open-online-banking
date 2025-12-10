import { createFileRoute } from "@tanstack/react-router";

import { ItemGroup } from "@repo/web-ui/item";

import { TransactionCard } from "../../components/transactionCard";

export const Route = createFileRoute("/(auth)/transactions")({
  component: RouteComponent,
});

interface TransactionGroupProps {
  label: string;
}

function TransactionGroup({ label }: TransactionGroupProps) {
  return (
    <ItemGroup>
      <p className="text-foreground py-2 first:pt-0">{label}</p>
      {[0, 1, 2].map((_, i) => (
        <TransactionCard key={`transaction-card-${i}`} />
      ))}
    </ItemGroup>
  );
}

function RouteComponent() {
  return (
    <section className="space-y-1.5">
      {["Today", "November", "October", "September"].map((label) => (
        <TransactionGroup key={label} label={label} />
      ))}
    </section>
  );
}
