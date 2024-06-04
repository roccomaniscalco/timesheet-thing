import { CONTRACTOR_STATUS, WEEKDAY } from '@/constants'
import * as schema from '@/server/schema'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { neon } from '@neondatabase/serverless'
import { and, desc, eq, not, or, sql, sum } from 'drizzle-orm'
import { NeonHttpDatabase, drizzle } from 'drizzle-orm/neon-http'
import { Hono, type Env } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createMiddleware } from 'hono/factory'
import { z } from 'zod'

type Bindings = {
  DATABASE_URL: string
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
}

type Variables = {
  db: NeonHttpDatabase<typeof schema>
  user: User
}

interface Options extends Env {
  Bindings: Bindings
  Variables: Variables
}

const publicMetadataSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('contractor'), contractorId: z.number().int() }),
  z.object({ role: z.literal('manager'), managerId: z.number().int() })
])

const userSchema = z
  .object({
    publicMetadata: publicMetadataSchema
  })
  .passthrough()

type User = z.infer<typeof userSchema>

const dbMiddleware = createMiddleware<Options>((c, next) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql, { schema })
  c.set('db', db)
  return next()
})

const userMiddleware = createMiddleware<Options>(async (c, next) => {
  const clerkClient = c.get('clerk')
  const auth = getAuth(c)
  if (!auth?.userId) throw new HTTPException(401, { message: 'Unauthorized' })

  const user = userSchema.parse(await clerkClient.users.getUser(auth.userId))
  c.set('user', user)
  return next()
})

const whereTimesheetRead = (user: User) =>
  user.publicMetadata.role === 'manager'
    ? and(
        eq(schema.timesheets.managerId, user.publicMetadata.managerId),
        not(eq(schema.timesheets.status, 'draft'))
      )
    : eq(schema.timesheets.contractorId, user.publicMetadata.contractorId)

const baseApi = new Hono<Options>()
  .basePath('/api')
  .use(clerkMiddleware())
  .use(userMiddleware)
  .use(dbMiddleware)
  .onError((e, c) => {
    console.error(e)
    return c.json({ message: 'Internal Server Error' }, 500)
  })
  .get('/timesheets', async (c) => {
    const timeseheets = await c.var.db.query.timesheets.findMany({
      where: whereTimesheetRead(c.var.user),
      with: {
        tasks: true,
        history: true,
        contractor: true
      }
    })
    return c.json(timeseheets, 200)
  })
  .get('/timesheets/:id{[0-9]+}', async (c) => {
    const id = Number.parseInt(c.req.param('id'))
    const timesheet = await c.var.db.query.timesheets.findFirst({
      where: and(
        eq(schema.timesheets.id, id),
        whereTimesheetRead(c.var.user)
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

const contractor = new Hono<Options>()
  .get('/profile/:id', async (c) => {
    const id = Number.parseInt(c.req.param('id'))

    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.id, id)
    })
    if (!contractor) return c.json({ message: 'Not Found' }, 404)

    const res = await fetch(
      `https://api.clerk.com/v1/users/${contractor.clerkId}`,
      {
        headers: {
          Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}`
        }
      }
    )
    const clerkUserSchema = z.object({
      id: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      image_url: z.string(),
      primary_email_address_id: z.string(),
      email_addresses: z.array(
        z.object({
          id: z.string(),
          email_address: z.string()
        })
      )
    })
    const data = await res.json()
    const parsedData = clerkUserSchema.parse(data)
    const clerkUser = {
      id: parsedData.id,
      first_name: parsedData.first_name,
      last_name: parsedData.last_name,
      image_url: parsedData.image_url,
      email: parsedData.email_addresses.find(
        (e) => e.id === parsedData.primary_email_address_id
      )?.email_address
    }
    return c.json(clerkUser, 200)
  })
  .get('/timesheets', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId)
    })
    if (!contractor) return c.json({ message: 'Forbidden' }, 403)

    const timesheets = await c.var.db
      .select({
        id: schema.timesheets.id,
        slug: schema.timesheets.slug,
        status: schema.timesheets.status,
        weekStart: schema.timesheets.weekStart,
        totalHours:
          sql<number>`coalesce(${sum(schema.tasks.hours)}, 0)`.mapWith(Number)
      })
      .from(schema.tasks)
      .where(eq(schema.timesheets.contractorId, contractor.id))
      .groupBy(schema.timesheets.id)
      .rightJoin(
        schema.timesheets,
        eq(schema.timesheets.id, schema.tasks.timesheetId)
      )
      .orderBy(desc(schema.timesheets.id))
    return c.json(timesheets, 200)
  })
  .post('/timesheets', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId)
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
  .put(
    '/timesheets/:id',
    // TODO: Add validation for weekStart
    zValidator('json', z.object({ weekStart: z.string().nullable() })),
    async (c) => {
      const auth = getAuth(c)
      if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
      const contractor = await c.var.db.query.contractors.findFirst({
        where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId)
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
        .returning()
      return c.json(timeseheets[0]?.weekStart, 200)
    }
  )
  .put(
    '/timesheets/:id/status',
    zValidator('json', z.object({ toStatus: z.enum(CONTRACTOR_STATUS) })),
    async (c) => {
      const auth = getAuth(c)
      if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
      const contractor = await c.var.db.query.contractors.findFirst({
        where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId)
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
    '/timesheets/tasks',
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
        where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId)
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
  .delete('/timesheets/tasks/:id', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ message: 'Unauthorized' }, 401)
    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId)
    })
    if (!contractor) return c.json({ message: 'Forbidden' }, 403)

    const id = Number(c.req.param('id'))
    const deletedTasks = await c.var.db
      .delete(schema.tasks)
      .where(eq(schema.tasks.id, id))
      .returning({ id: schema.tasks.id })
    return c.json(deletedTasks[0]?.id, 200)
  })

const apiRoutes = baseApi.route('/contractor', contractor)
type ApiRoutesType = typeof apiRoutes

export { apiRoutes, type ApiRoutesType }
