import { type ClassValue, clsx } from "clsx";
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
