import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { NeonHttpDatabase, drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../src/schema";

type Bindings = {
  DATABASE_URL: string;
};

type Variables = {
  db: NeonHttpDatabase<typeof schema>;
};

const api = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .basePath("/api")
  .use(async (c, next) => {
    const sql = neon(c.env.DATABASE_URL);
    const db = drizzle(sql, { schema });
    c.set("db", db);
    await next();
  })
  .get("/hello", zValidator("query", z.object({ name: z.string() })), (c) => {
    const { name } = c.req.valid("query");
    return c.json({
      message: `Hello, ${name}!`,
    });
  })
  .get("/timesheets", async (c) => {
    const timesheets = await c.var.db.query.timesheetTable.findMany();
    return c.json(timesheets);
  });

export type ApiType = typeof api;

export const onRequest = handle(api);
