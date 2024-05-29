import { clsx, type ClassValue } from "clsx";
import { endOfWeek } from "date-fns";
import type { DateRange } from "react-day-picker";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const startDateFormatter = Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const endDateFormatter = Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
export function formatDateRange(dateRange: DateRange) {
  return `${startDateFormatter.format(dateRange.from)} - ${endDateFormatter.format(dateRange.to)}`;
}

export function getWeekRange(weekStart: string) {
  let date = new Date(weekStart);
  // Fix timezone offset that causes date to be a day behind
  date = new Date(date.getTime() - date.getTimezoneOffset() * -60000);
  return { from: date, to: endOfWeek(date) } satisfies DateRange;
}
