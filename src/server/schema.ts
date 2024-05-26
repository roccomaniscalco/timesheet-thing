import { STATUS, WEEK_DAY } from "@/constants";
import { generateSlug } from "@/server/generate-slug";
import {
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const managers = pgTable(
  "managers",
  {
    id: serial("id").primaryKey(),
    clerkId: varchar("clerk_id").notNull(),
  },
  (table) => ({
    clerkIdIdx: uniqueIndex("managers_clerk_id_idx").on(table.clerkId),
  })
);

export const contractors = pgTable(
  "contractors",
  {
    id: serial("id").primaryKey(),
    clerkId: varchar("clerk_id").notNull(),
    managerId: integer("manager_id").references(() => managers.id),
    approvedHours: integer("approved_hours").notNull().default(0),
  },
  (table) => ({
    clerkIdIdx: uniqueIndex("contractors_clerk_id_idx").on(table.clerkId),
  })
);

export const status = pgEnum("status", STATUS);

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  slug: varchar("slug").$defaultFn(() => generateSlug()).notNull(),
  status: status("status").notNull(),
  weekStart: date("week_start"),
  contractorId: integer("contractor_id").references(() => contractors.id),
});

export const weekDay = pgEnum("week_day", WEEK_DAY);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  weekDay: weekDay("week_day").notNull(),
  name: varchar("name"),
  hours: decimal("hours"),
  timesheetId: integer("timesheet_id")
    .references(() => timesheets.id, { onDelete: "cascade" })
    .notNull(),
});
