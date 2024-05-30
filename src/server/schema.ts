import { STATUSES, WEEKDAYS } from "@/constants";
import { generateSlug } from "@/server/generate-slug";
import {
  date,
  real,
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

export const status = pgEnum("status", STATUSES);

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  slug: varchar("slug").$defaultFn(() => generateSlug()).notNull(),
  status: status("status").notNull(),
  weekStart: date("week_start"),
  contractorId: integer("contractor_id").references(() => contractors.id),
});

export const weekday = pgEnum("weekday", WEEKDAYS);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  weekday: weekday("weekday").notNull(),
  hours: real("hours").notNull(),
  name: varchar("name").notNull(),
  timesheetId: integer("timesheet_id")
    .references(() => timesheets.id, { onDelete: "cascade" })
    .notNull(),
});
