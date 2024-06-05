import { CONTRACTOR_STATUS, WEEKDAY } from '@/constants'
import * as schema from '@/server/schema'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { neon } from '@neondatabase/serverless'
import { and, eq, not, or } from 'drizzle-orm'
import { NeonHttpDatabase, drizzle } from 'drizzle-orm/neon-http'
import { Hono, type Env } from 'hono'
import { createMiddleware } from 'hono/factory'
import { z } from 'zod'

type Bindings = {
  DATABASE_URL: string
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
}

type Variables = {
  db: NeonHttpDatabase<typeof schema>
}

interface Options extends Env {
  Bindings: Bindings
  Variables: Variables
}

const dbMiddleware = createMiddleware<Options>((c, next) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql, { schema })
  c.set('db', db)
  return next()
})

const baseApi = new Hono<Options>()
  .basePath('/api')
  .use(clerkMiddleware())
  .use(dbMiddleware)
  .onError((e, c) => {
    console.error(e)
    return c.json({ message: 'Internal Server Error' }, 500)
  })

const usersApi = new Hono<Options>() //
  .get('/profile/:id', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)

    const clerkClient = c.get('clerk')
    const user = await clerkClient.users.getUser(c.req.param('id'))
    const publicUser = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses.find(
        (e) => e.id === user.primaryEmailAddressId
      )?.emailAddress,
      imageUrl: user.hasImage ? user.imageUrl : undefined
    }
    return c.json(publicUser, 200)
  })

const timesheetsApi = new Hono<Options>()
  .get('/', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)

    const timesheets = await c.var.db.query.timesheets.findMany({
      where: or(
        eq(schema.timesheets.contractorId, auth.userId),
        and(
          eq(schema.timesheets.managerId, auth.userId),
          not(eq(schema.timesheets.status, 'draft'))
        )
      ),
      with: {
        tasks: { columns: { hours: true } },
        contractor: true
      }
    })

    return c.json(timesheets, 200)
  })
  .post('/', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.id, auth.userId)
    })
    if (!contractor) return c.json({ message: 'Forbidden' }, 403)

    const newTimesheet = await c.var.db
      .insert(schema.timesheets)
      .values({
        contractorId: contractor.id,
        managerId: contractor.managerId,
        rate: contractor.rate,
        approvedHours: contractor.approvedHours,
        status: 'draft'
      })
      .returning()
    if (!newTimesheet[0]) throw new Error('Failed to create timesheet')
    return c.json(newTimesheet[0], 201)
  })
  .get('/:id{[0-9]+}', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)

    const id = Number.parseInt(c.req.param('id'))
    const timesheet = await c.var.db.query.timesheets.findFirst({
      where: and(
        eq(schema.timesheets.id, id),
        or(
          eq(schema.timesheets.contractorId, auth.userId),
          and(
            eq(schema.timesheets.managerId, auth.userId),
            not(eq(schema.timesheets.status, 'draft'))
          )
        )
      ),
      with: {
        tasks: true,
        history: true,
        contractor: true
      }
    })
    if (!timesheet) return c.json({ message: 'Not found' }, 404)
    return c.json(timesheet, 200)
  })
  .put(
    '/:id',
    // TODO: Add validation for weekStart
    zValidator('json', z.object({ weekStart: z.string().nullable() })),
    async (c) => {
      const auth = getAuth(c)
      if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
      const contractor = await c.var.db.query.contractors.findFirst({
        where: (contractors, { eq }) => eq(contractors.id, auth.userId)
      })
      if (!contractor) return c.json({ message: 'Forbidden' }, 403)

      const weekStart = c.req.valid('json').weekStart
      const id = Number(c.req.param('id'))
      const timeseheets = await c.var.db
        .update(schema.timesheets)
        .set({ weekStart })
        .where(
          and(
            eq(schema.timesheets.id, id),
            eq(schema.timesheets.contractorId, contractor.id)
          )
        )
        .returning({ weekStart: schema.timesheets.weekStart })
      return c.json(timeseheets[0]?.weekStart, 200)
    }
  )
  .put(
    '/:id/status',
    zValidator('json', z.object({ toStatus: z.enum(CONTRACTOR_STATUS) })),
    async (c) => {
      const auth = getAuth(c)
      if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
      const contractor = await c.var.db.query.contractors.findFirst({
        where: (contractors, { eq }) => eq(contractors.id, auth.userId)
      })
      if (!contractor) return c.json({ message: 'Forbidden' }, 403)

      const timesheetId = Number(c.req.param('id'))
      const { toStatus } = c.req.valid('json')
      const fromStatus = toStatus === 'draft' ? 'submitted' : 'draft'

      const updatedStatuses = await c.var.db
        .update(schema.timesheets)
        .set({ status: toStatus })
        .where(
          and(
            eq(schema.timesheets.id, timesheetId),
            eq(schema.timesheets.contractorId, contractor.id),
            eq(schema.timesheets.status, fromStatus)
          )
        )
        .returning({ status: schema.timesheets.status })
      if (!updatedStatuses[0]) throw new Error('Failed to update status')

      const newHistory = await c.var.db
        .insert(schema.history)
        .values({
          contractorId: contractor.id,
          timesheetId: timesheetId,
          description: 'changed status',
          fromStatus,
          toStatus
        })
        .returning()
      if (!newHistory[0]) throw new Error('Failed to create history')

      return c.json(newHistory[0], 200)
    }
  )
  .patch(
    '/tasks',
    zValidator(
      'json',
      z.object({
        id: z.number().optional(),
        timesheetId: z.number(),
        weekday: z.enum(WEEKDAY, { message: 'Day is required' }),
        name: z.string().min(1, { message: 'Task is required' }),
        hours: z
          .number({ message: 'Hours is required' })
          .positive({ message: 'Hours must be positive' })
          .refine((v) => v % 0.25 === 0, {
            message: 'Hours must be in 0.25 increments'
          })
      })
    ),
    async (c) => {
      const auth = getAuth(c)
      if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
      const contractor = await c.var.db.query.contractors.findFirst({
        where: (contractors, { eq }) => eq(contractors.id, auth.userId)
      })
      if (!contractor) return c.json({ message: 'Forbidden' }, 403)

      const task = c.req.valid('json')
      const newTasks = await c.var.db
        .insert(schema.tasks)
        .values(task)
        .onConflictDoUpdate({
          target: schema.tasks.id,
          set: { ...task, id: undefined }
        })
        .returning()
      return c.json(newTasks[0], 201)
    }
  )
  .delete('/tasks/:id', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.id, auth.userId)
    })
    if (!contractor) return c.json({ message: 'Forbidden' }, 403)

    const id = Number(c.req.param('id'))
    const deletedTasks = await c.var.db
      .delete(schema.tasks)
      .where(eq(schema.tasks.id, id))
      .returning({ id: schema.tasks.id })
    return c.json(deletedTasks[0]?.id, 200)
  })

const apiRoutes = baseApi
  .route('/timesheets', timesheetsApi)
  .route('/users', usersApi)
type ApiRoutesType = typeof apiRoutes

export { apiRoutes, type ApiRoutesType }
