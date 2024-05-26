import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiType } from "@/server/api";
import { ClockIcon } from "@heroicons/react/16/solid";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { hc, type InferResponseType } from "hono/client";

const { api } = hc<ApiType>("/");

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <>
      <TimesheetsGrid />
    </>
  );
}

function TimesheetsGrid() {
  const { data: timesheets } = useQuery({
    queryKey: ["get-timesheets"],
    queryFn: async () => {
      const res = await api.contractor.timesheets.$get();
      if (res.ok) return res.json();
    },
  });

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {timesheets?.map((timesheet) => (
          <TimesheetCard key={timesheet.id} {...timesheet} />
        ))}
      </div>
    </div>
  );
}

type Timesheets = InferResponseType<typeof api.contractor.timesheets.$get, 200>;
type Timesheet = Timesheets[number];

interface TimesheetCardProps extends Timesheet {}
function TimesheetCard(props: TimesheetCardProps) {
  const startDateFormatter = Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  const endDateFormatter = Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const getWeekRange = (weekStart: string | null) => {
    if (!weekStart) return "-";

    let date = new Date(weekStart);

    // Fix timezone offset that causes date to be a day behind
    date = new Date(date.getTime() - date.getTimezoneOffset() * -60000);
    const start = startDateFormatter.format(date);
    date.setDate(date.getDate() + 6);
    const end = endDateFormatter.format(date);
    return `${start} - ${end}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">
          {getWeekRange(props.weekStart)}
        </CardTitle>
        <div className="text-sm text-secondary-foreground">{props.slug}</div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex items-center justify-between">
          <StatusBadge status={props.status} />
          <div className="flex items-center gap-2 border-none p-0">
            <ClockIcon className="w-4 h-4" />
            {props.totalHours}h
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
