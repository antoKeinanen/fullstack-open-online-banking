export function formatAddress(
  homeAddress: string,
  postCode: string,
  city: string,
): string {
  return [homeAddress.trim(), postCode.trim(), city.trim()]
    .filter(Boolean)
    .join(" ");
}
