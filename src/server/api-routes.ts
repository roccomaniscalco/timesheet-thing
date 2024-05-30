import { WEEK_DAY } from "@/constants";
import * as schema from "@/server/schema";
import { taskFormSchema } from "@/validation";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { neon } from "@neondatabase/serverless";
import { and, desc, eq, sql, sum } from "drizzle-orm";
import { NeonHttpDatabase, drizzle } from "drizzle-orm/neon-http";
import { Hono, type Env } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";

type Bindings = {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
};

type Variables = {
  db: NeonHttpDatabase<typeof schema>;
};

interface Options extends Env {
  Bindings: Bindings;
  Variables: Variables;
}

const dbMiddleware = () =>
  createMiddleware<Options>((c, next) => {
    const sql = neon(c.env.DATABASE_URL);
    const db = drizzle(sql, { schema });
    c.set("db", db);
    return next();
  });

const baseApi = new Hono<Options>()
  .basePath("/api")
  .use(clerkMiddleware())
  .use(dbMiddleware())
  .onError((e, c) => {
    console.error(e);
    return c.json({ message: "Internal Server Error" }, 500);
  });

const contractor = new Hono<Options>()
  .get("/timesheets", async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ message: "Unauthorized" }, 401);
    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId),
    });
    if (!contractor) return c.json({ message: "Forbidden" }, 403);

    const timesheets = await c.var.db
      .select({
        id: schema.timesheets.id,
        slug: schema.timesheets.slug,
        status: schema.timesheets.status,
        weekStart: schema.timesheets.weekStart,
        totalHours:
          sql<number>`coalesce(${sum(schema.tasks.hours)}, 0)`.mapWith(Number),
      })
      .from(schema.tasks)
      .where(eq(schema.timesheets.contractorId, contractor.id))
      .groupBy(schema.timesheets.id)
      .rightJoin(
        schema.timesheets,
        eq(schema.timesheets.id, schema.tasks.timesheetId)
      )
      .orderBy(desc(schema.timesheets.id));
    return c.json(timesheets, 200);
  })
  .get("/timesheets/:id", async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ message: "Unauthorized" }, 401);
    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId),
    });
    if (!contractor) return c.json({ message: "Forbidden" }, 403);

    const id = Number(c.req.param("id"));
    const timesheet = await c.var.db.query.timesheets.findFirst({
      where: (timesheets, { and, eq }) =>
        and(eq(timesheets.id, id), eq(timesheets.contractorId, contractor.id)),
    });
    if (!timesheet) return c.json({ message: "Not Found" }, 404);
    const tasks = await c.var.db.query.tasks.findMany({
      where: (tasks, { eq }) => eq(tasks.timesheetId, timesheet.id),
    });
    return c.json({ ...timesheet, tasks }, 200);
  })
  .put(
    "/timesheets/:id",
    zValidator("json", z.object({ weekStart: z.string().nullable() })),
    async (c) => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ message: "Unauthorized" }, 401);
      const contractor = await c.var.db.query.contractors.findFirst({
        where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId),
      });
      if (!contractor) return c.json({ message: "Forbidden" }, 403);

      const weekStart = c.req.valid("json").weekStart;
      const id = Number(c.req.param("id"));
      const timeseheets = await c.var.db
        .update(schema.timesheets)
        .set({ weekStart })
        .where(
          and(
            eq(schema.timesheets.id, id),
            eq(schema.timesheets.contractorId, contractor.id)
          )
        )
        .returning();
      return c.json(timeseheets[0], 200);
    }
  )
  .post("/timesheets", async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ message: "Unauthorized" }, 401);
    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId),
    });
    if (!contractor) return c.json({ message: "Forbidden" }, 403);

    const newTimesheet = await c.var.db
      .insert(schema.timesheets)
      .values({
        contractorId: contractor.id,
        status: "draft",
      })
      .returning();
    return c.json(newTimesheet[0], 201);
  })
  .post(
    "/timesheets/:id/tasks",
    zValidator("json", taskFormSchema),
    async (c) => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ message: "Unauthorized" }, 401);
      const contractor = await c.var.db.query.contractors.findFirst({
        where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId),
      });
      if (!contractor) return c.json({ message: "Forbidden" }, 403);

      const timesheetId = Number(c.req.param("id"));
      const { weekDay, name, hours } = c.req.valid("json");
      const newTask = await c.var.db
        .insert(schema.tasks)
        .values({
          timesheetId,
          weekDay,
          name,
          hours,
        })
        .returning();
      return c.json(newTask[0], 201);
    }
  );

const apiRoutes = baseApi.route("/contractor", contractor);
type ApiRoutesType = typeof apiRoutes;

export { apiRoutes, type ApiRoutesType };
