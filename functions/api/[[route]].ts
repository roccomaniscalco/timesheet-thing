import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { z } from "zod";

const api = new Hono()
  .basePath("/api")
  .get("/hello", zValidator("query", z.object({ name: z.string() })), (c) => {
    const { name } = c.req.valid("query");
    return c.json({
      message: `Hello, ${name}!`,
    });
  })
  .post(
    "/sum",
    zValidator("json", z.object({ a: z.number(), b: z.number() })),
    (c) => {
      const { a, b } = c.req.valid("json");
      return c.json({ sum: a + b });
    }
  );

export type ApiType = typeof api;

export const onRequest = handle(api);
