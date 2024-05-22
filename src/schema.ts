import {
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  varchar,
} from "drizzle-orm/pg-core";

export const status = pgEnum("status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  weekOf: date("date").notNull(),
  status: status("status").notNull(),
});

export const weekDay = pgEnum("week_day", [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
]);

export const tasks = pgTable("task", {
  id: serial("id").primaryKey(),
  weekDay: weekDay("week_day").notNull(),
  name: varchar("name"),
  hours: decimal("hours"),
  timesheetId: integer("timesheet_id")
    .references(() => timesheets.id, { onDelete: "cascade" })
    .notNull(),
});
