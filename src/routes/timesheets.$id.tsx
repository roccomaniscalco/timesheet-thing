import type { ApiType } from "@/server/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { hc } from "hono/client";

export const Route = createFileRoute("/timesheets/$id")({
  component: () => <Timesheet />,
});

const { api } = hc<ApiType>("/");

function Timesheet() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: timesheet } = useQuery({
    queryKey: ["get-timesheet", id],
    queryFn: async () => {
      const res = await api.contractor.timesheets["$id"].$get({
        query: { id },
      });
      if (!res.ok) throw new Error("Failed to get timesheet");
      return res.json();
    },
  });

  return <div>Timesheet/{timesheet?.slug}</div>;
}
