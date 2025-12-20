export function formatAddress(
  homeAddress: string,
  postCode: string,
  city: string,
): string {
  return [homeAddress.trim(), postCode.trim(), city.trim()]
    .filter(Boolean)
    .join(" ");
}

export function formatDateTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  },
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return "Invalid date";
  }
  return new Intl.DateTimeFormat("en-CA", options).format(d);
}

export function formatBalance(hex: string): string {
  return (BigInt(`0x${hex}`) / BigInt(100)).toLocaleString("ca-CA", {
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}
