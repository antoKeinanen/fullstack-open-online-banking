import type { Transfer } from "@repo/validators/user";
import { ItemGroup } from "@repo/web-ui/item";

import { TransferCard } from "./transferCard";

export interface TransactionGroupProps {
  label: string;
  transfers: Transfer[];
}

export function TransferGroup({ label, transfers }: TransactionGroupProps) {
  return (
    <ItemGroup>
      <p className="text-foreground py-2 first:pt-0">{label}</p>
      {transfers.map((transfer) => (
        <TransferCard transfer={transfer} key={transfer.transferId} />
      ))}
    </ItemGroup>
  );
}
