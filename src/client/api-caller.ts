import type { ApiRoutesType } from "@/server/api-routes";
import { hc } from "hono/client";

export const { api } = hc<ApiRoutesType>("/");
