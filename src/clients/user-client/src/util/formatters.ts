export function formatAddress(
  homeAddress: string,
  postCode: string,
  city: string,
): string {
  return `${homeAddress} ${postCode} ${city}`;
}
