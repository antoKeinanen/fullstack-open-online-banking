import { isBefore } from "date-fns";

export function isOverYears(years: number, date: Date): boolean {
  const now = new Date();
  const targetDate = new Date(date);
  targetDate.setFullYear(targetDate.getFullYear() + years);
  return isBefore(targetDate, now);
}
