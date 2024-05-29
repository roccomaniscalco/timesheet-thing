import type { ApiRoutesType } from "@/server/api";
import { hc } from "hono/client";

export const { api } = hc<ApiRoutesType>("/");
