import {
  ArrowLeftRightIcon,
  ClockIcon,
  UserIcon,
  UserRoundCogIcon,
  XCircleIcon,
} from "lucide-react";

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

function formatTransfer({
  voided,
  pending,
  isSystemTransfer,
  isIncreasingTransfer,
  creditUserFullName,
  debitUserFullName,
}: Transfer) {
  const conditions = [
    {
      check: () => voided && isSystemTransfer,
      label: "Failed",
      avatar: <XCircleIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: "System Float Account",
    },
    {
      check: () => voided,
      label: "Failed",
      avatar: <XCircleIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: isIncreasingTransfer ? creditUserFullName : debitUserFullName,
    },
    {
      check: () => pending && isSystemTransfer,
      label: "Pending",
      avatar: <ClockIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: "System Float Account",
    },
    {
      check: () => pending,
      label: "Pending",
      avatar: <ClockIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: isIncreasingTransfer ? creditUserFullName : debitUserFullName,
    },
    {
      check: () => isSystemTransfer,
      label: isIncreasingTransfer ? "Deposited" : "Withdrew",
      avatar: <UserRoundCogIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: "System Float Account",
    },
    {
      check: () => !isSystemTransfer,
      label: isIncreasingTransfer ? "Sent You" : "You Sent",
      avatar: <UserIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: isIncreasingTransfer ? creditUserFullName : debitUserFullName,
    },
  ];

  return (
    conditions.find((c) => c.check()) ?? {
      avatar: <ArrowLeftRightIcon />,
      label: "Transfer",
      symbol: "",
      recipient: "Unexpected",
    }
  );
}

export function TransferCard({ transfer }: TransferCardProps) {
  const format = formatTransfer(transfer);
  return (
    <Item className="not-last:border-b-border rounded-none">
      <ItemMedia>
        <Avatar className="size-12">
          <AvatarImage src="TODO" />
          <AvatarFallback>{format.avatar}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{format.recipient}</ItemTitle>
        <ItemDescription>
          {format.label} • {formatDateTime(transfer.timestamp)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant="secondary">
          {format.symbol} {formatBalance(transfer.amount)}
        </Badge>
      </ItemActions>
    </Item>
  );
}
