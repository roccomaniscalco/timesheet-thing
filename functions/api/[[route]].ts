import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { NeonHttpDatabase, drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../src/schema";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

type Bindings = {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
};

type Variables = {
  db: NeonHttpDatabase<typeof schema>;
};

const api = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .basePath("/api")
  .use(clerkMiddleware())
  .use(async (c, next) => {
    const sql = neon(c.env.DATABASE_URL);
    const db = drizzle(sql, { schema });
    c.set("db", db);
    await next();
  })
  .get("/timesheets", async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const contractor = await c.var.db.query.contractors.findFirst({
      where: (contractors, { eq }) => eq(contractors.clerkId, auth.userId),
    });
    if (!contractor) {
      return c.json({ message: "Forbidden" }, 403);
    }
    const timesheets = await c.var.db.query.timesheets.findMany({
      where: (timesheets, { eq }) => eq(timesheets.contractorId, 1),
    });
    return c.json(timesheets, 200);
  })
  .onError((e, c) => {
    console.error(e);
    return c.json({ message: "Internal Server Error" }, 500);
  });

export type ApiType = typeof api;

export const onRequest = handle(api);
