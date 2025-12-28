import type { GetUserTransfersResponse, Transfer } from "@repo/validators/user";

function dateGrouper(transfer: Transfer) {
  const date = new Date(transfer.timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - dateToCheck.getTime();
  const diffDaysRounded = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDaysRounded === 0) return "Today";
  if (diffDaysRounded === 1) return "Yesterday";
  if (diffDaysRounded > 1 && diffDaysRounded <= 7) return "This week";

  const monthName = date.toLocaleString("en-CA", { month: "long" });
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();

  return year < currentYear ? `${monthName} ${year}` : monthName;
}

interface GroupedTransfers {
  label: string;
  items: Transfer[];
}

function groupTransfers(transfers: Transfer[]): GroupedTransfers[] {
  const groups = new Map<string, Transfer[]>();

  transfers.forEach((transfer) => {
    const label = dateGrouper(transfer);
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)?.push(transfer);
  });

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items,
  }));
}

function dedupeTransfers(pages: GetUserTransfersResponse[]) {
  if (pages.length === 0) return [];
  if (pages.length === 1) return pages[0].transfers;

  const transfers = pages.flatMap((page) => page.transfers);

  const seen = new Set<string>();
  const result: (typeof transfers)[number][] = [];

  transfers.forEach((transfer) => {
    if (seen.has(transfer.transferId)) return;
    seen.add(transfer.transferId);
    result.push(transfer);
  });

  return result;
}

export function processTransfers(
  pages: GetUserTransfersResponse[],
): GroupedTransfers[] {
  return groupTransfers(dedupeTransfers(pages));
}
