export const STATUS = ["draft", "submitted", "approved", "rejected"] as const;
export type Status = typeof STATUS[number];

export const WEEK_DAY = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekDay = typeof WEEK_DAY[number];
