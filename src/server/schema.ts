import { STATUS, WEEKDAY } from '@/constants'
import { generateSlug } from '@/server/generate-slug'
import type { InferSelectModel } from 'drizzle-orm'
import {
  date,
  real,
  integer,
  pgEnum,
  pgTable,
  serial,
  uniqueIndex,
  varchar,
  timestamp
} from 'drizzle-orm/pg-core'

export const status = pgEnum('status', STATUS)

export const weekday = pgEnum('weekday', WEEKDAY)

export const managers = pgTable(
  'managers',
  {
    id: serial('id').primaryKey(),
    clerkId: varchar('clerk_id').notNull()
  },
  (table) => ({
    clerkIdIdx: uniqueIndex('managers_clerk_id_idx').on(table.clerkId)
  })
)

export const contractors = pgTable(
  'contractors',
  {
    id: serial('id').primaryKey(),
    clerkId: varchar('clerk_id').notNull(),
    approvedHours: integer('approved_hours').notNull(),
    rate: real('rate').notNull(),
    managerId: integer('manager_id')
      .references(() => managers.id, { onDelete: 'no action' })
      .notNull()
  },
  (table) => ({
    clerkIdIdx: uniqueIndex('contractors_clerk_id_idx').on(table.clerkId)
  })
)

export const timesheets = pgTable('timesheets', {
  id: serial('id').primaryKey(),
  slug: varchar('slug')
    .$defaultFn(() => generateSlug())
    .notNull(),
  status: status('status').notNull(),
  weekStart: date('week_start'),
  contractorId: integer('contractor_id').references(() => contractors.id),
  approvedHours: integer('approved_hours').notNull(),
  rate: real('rate').notNull()
})

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  weekday: weekday('weekday').notNull(),
  hours: real('hours').notNull(),
  name: varchar('name').notNull(),
  timesheetId: integer('timesheet_id')
    .references(() => timesheets.id, { onDelete: 'cascade' })
    .notNull()
})
export type TaskModel = InferSelectModel<typeof tasks>

export const history = pgTable('history', {
  id: serial('id').primaryKey(),
  description: varchar('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  fromStatus: status('from_status').notNull(),
  toStatus: status('to_status').notNull(),
  comment: varchar('comment'),
  timesheetId: integer('timesheet_id').references(() => timesheets.id),
  contractorId: integer('contractor_id').references(() => contractors.id),
  managerId: integer('manager_id').references(() => managers.id)
})
export type HistoryModel = InferSelectModel<typeof history>
