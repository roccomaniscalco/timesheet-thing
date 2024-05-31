export const STATUS = ["draft", "submitted", "approved", "rejected"] as const;
export type Status = (typeof STATUS)[number];

export const WEEKDAY = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
export type Weekday = (typeof WEEKDAY)[number];
