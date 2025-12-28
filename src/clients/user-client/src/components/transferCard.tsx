import { UserRoundCogIcon } from "lucide-react";

import type { Transfer } from "@repo/validators/user";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/web-ui/avatar";
import { Badge } from "@repo/web-ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@repo/web-ui/item";

import { formatBalance, formatDateTime } from "../util/formatters";

interface TransferCardProps {
  transfer: Transfer;
}

function formatLabel(isIncreasing: boolean, isSystem: boolean) {
  return isSystem
    ? isIncreasing
      ? "Deposited"
      : "Withdrew"
    : isIncreasing
      ? "Sent you"
      : "You sent";
}

export function TransferCard({ transfer }: TransferCardProps) {
  return (
    <Item className="not-last:border-b-border rounded-none">
      <ItemMedia>
        <Avatar className="size-12">
          <AvatarImage src="TODO" />
          <AvatarFallback>
            {transfer.isSystemTransfer ? <UserRoundCogIcon /> : "AK"}
          </AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {transfer.isIncreasingTransfer
            ? transfer.creditUserFullName
            : transfer.debitUserFullName}
          {transfer.isSystemTransfer && "System float account"}
        </ItemTitle>
        <ItemDescription>
          {formatLabel(
            transfer.isIncreasingTransfer,
            transfer.isSystemTransfer,
          )}{" "}
          • {formatDateTime(transfer.timestamp)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant="secondary">
          {transfer.isIncreasingTransfer ? "+" : "-"}
          {formatBalance(transfer.amount)}
        </Badge>
      </ItemActions>
    </Item>
  );
}
