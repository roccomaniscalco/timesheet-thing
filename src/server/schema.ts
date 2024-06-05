import { STATUS, WEEKDAY } from '@/constants'
import { generateSlug } from '@/server/generate-slug'
import { relations } from 'drizzle-orm'
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
    internal_id: serial('internal_id').primaryKey(),
    id: varchar('id').notNull().unique()
  },
  (table) => ({
    idIdx: uniqueIndex('manager_id_idx').on(table.id)
  })
)

export const managersRelations = relations(managers, ({ many }) => ({
  contractors: many(contractors),
  timesheets: many(timesheets),
  history: many(history)
}))

export const contractors = pgTable(
  'contractors',
  {
    internal_id: serial('internal_id').primaryKey(),
    id: varchar('id').notNull().unique(),
    approvedHours: integer('approved_hours').notNull(),
    rate: real('rate').notNull(),
    managerId: varchar('manager_id')
      .references(() => managers.id, { onDelete: 'no action' })
      .notNull()
  },
  (table) => ({
    idIdx: uniqueIndex('contractor_id_idx').on(table.id)
  })
)

export const contractorsRelations = relations(contractors, ({ one, many }) => ({
  timesheets: many(timesheets),
  history: many(history),
  manager: one(managers, {
    fields: [contractors.managerId],
    references: [managers.id]
  })
}))

export const timesheets = pgTable('timesheets', {
  id: serial('id').primaryKey(),
  status: status('status').notNull(),
  weekStart: date('week_start'),
  approvedHours: integer('approved_hours').notNull(),
  rate: real('rate').notNull(),
  contractorId: varchar('contractor_id')
    .references(() => contractors.id)
    .notNull(),
  managerId: varchar('manager_id')
    .references(() => managers.id)
    .notNull()
})

export const timesheetsRelations = relations(timesheets, ({ one, many }) => ({
  tasks: many(tasks),
  history: many(history),
  contractor: one(contractors, {
    fields: [timesheets.contractorId],
    references: [contractors.id]
  }),
  manager: one(managers, {
    fields: [timesheets.managerId],
    references: [managers.id]
  })
}))

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  weekday: weekday('weekday').notNull(),
  hours: real('hours').notNull(),
  name: varchar('name').notNull(),
  timesheetId: integer('timesheet_id')
    .references(() => timesheets.id, { onDelete: 'cascade' })
    .notNull()
})

export const tasksRelations = relations(tasks, ({ one }) => ({
  timesheet: one(timesheets, {
    fields: [tasks.timesheetId],
    references: [timesheets.id]
  })
}))

export const history = pgTable('history', {
  id: serial('id').primaryKey(),
  description: varchar('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  fromStatus: status('from_status').notNull(),
  toStatus: status('to_status').notNull(),
  comment: varchar('comment'),
  timesheetId: integer('timesheet_id')
    .references(() => timesheets.id)
    .notNull(),
  contractorId: varchar('contractor_id').references(() => contractors.id),
  managerId: varchar('manager_id').references(() => managers.id)
})

export const historyRelations = relations(history, ({ one }) => ({
  timesheet: one(timesheets, {
    fields: [history.timesheetId],
    references: [timesheets.id]
  }),
  contractor: one(contractors, {
    fields: [history.contractorId],
    references: [contractors.id]
  }),
  manager: one(managers, {
    fields: [history.managerId],
    references: [managers.id]
  })
}))
