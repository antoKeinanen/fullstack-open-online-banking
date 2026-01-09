export function redactPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length <= 4) {
    return phoneNumber;
  }
  let redacted = "";
  for (let i = 0; i < phoneNumber.length - 4; i++) {
    const char = phoneNumber[i];
    if (char === " " || char === "-" || char === "+") {
      redacted += char;
    } else {
      redacted += "*";
    }
  }
  return redacted + phoneNumber.slice(-4);
}

export function redactJWT(jwt?: string): string | undefined {
  if (!jwt) return undefined;

  if (jwt.length <= 10) {
    return "***";
  }
  return jwt.slice(0, 5) + "..." + jwt.slice(-5);
}
