import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { neon } from "@neondatabase/serverless";
import { NeonHttpDatabase, drizzle } from "drizzle-orm/neon-http";
import { Hono, type Env } from "hono";
import { handle } from "hono/cloudflare-pages";
import { createMiddleware } from "hono/factory";
import * as schema from "@/schema";
import { eq, sql, sum } from "drizzle-orm";

type Bindings = {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
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

const api = new Hono<Options>()
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
        status: schema.timesheets.status,
        weekStart: schema.timesheets.weekStart,
        totalHours: sql<number>`coalesce(sum(${schema.tasks.hours}), 0)`.mapWith(Number),
        contractorId: schema.timesheets.contractorId,
      })
      .from(schema.tasks)
      .where(eq(schema.timesheets.contractorId, contractor.id))
      .groupBy(schema.timesheets.id)
      .rightJoin(
        schema.timesheets,
        eq(schema.timesheets.id, schema.tasks.timesheetId)
      );
    return c.json(timesheets, 200);
  })
  .post("/timesheet", async (c) => {
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
    return c.json(newTimesheet, 201);
  });

const apiRoutes = api.route("/contractor", contractor);

export type ApiType = typeof apiRoutes;

export const onRequest = handle(api);
