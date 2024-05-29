import { apiRoutes } from "@/server/api";
import { handle } from "hono/cloudflare-pages";

export const onRequest = handle(apiRoutes);
