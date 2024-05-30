import type { Weekday } from "@/constants";
import type { ApiRoutesType } from "@/server/api-routes";
import { queryOptions } from "@tanstack/react-query";
import { hc, type InferResponseType } from "hono/client";

export const { api } = hc<ApiRoutesType>("/", {
  fetch: async (
    input: RequestInfo | URL,
    requestInit?: RequestInit | undefined
  ) => {
    const res = await fetch(input, requestInit);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  },
});

export type Timesheet = InferResponseType<
  (typeof api.contractor.timesheets)[":id"]["$get"],
  200
>;
export type Task = Timesheet["tasks"][number];

export const timesheetQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: ["get-timesheet", id],
    queryFn: () =>
      api.contractor.timesheets[":id"].$get({
        param: { id },
      }),
    select: (timesheet) => {
      return {
        ...timesheet,
        // Group tasks by day
        tasksByDay: timesheet.tasks.reduce(
          (acc, curr) => {
            if (!acc[curr.weekday]) {
              acc[curr.weekday] = [];
            }
            acc[curr.weekday].push(curr);
            return acc;
          },
          {} as Record<Weekday, Task[]>
        ),
      };
    },
  });
};
