export const STATUSES = ["draft", "submitted", "approved", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];
