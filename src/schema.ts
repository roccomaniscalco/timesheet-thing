import { date, pgTable, serial } from "drizzle-orm/pg-core";

export const timesheetTable = pgTable("timesheet", {
  id: serial("id").primaryKey(),
  weekOf: date("date").notNull(),
});
