import { StatusBadge } from "@/client/components/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import type { ApiType } from "@/server/api";
import { ClockIcon } from "@heroicons/react/16/solid";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { InferResponseType } from "hono";
import { hc } from "hono/client";

export const Route = createFileRoute("/timesheets/")({
  component: TimesheetsGrid,
});

const { api } = hc<ApiType>("/");

function TimesheetsGrid() {
  const { data: timesheets } = useQuery({
    queryKey: ["get-timesheets"],
    queryFn: async () => {
      const res = await api.contractor.timesheets.$get();
      if (res.ok) return res.json();
    },
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {timesheets?.map((timesheet) => (
        <TimesheetCard key={timesheet.id} {...timesheet} />
      ))}
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

  const getWeekRange = (weekStart: string) => {
    let date = new Date(weekStart);
    // Fix timezone offset that causes date to be a day behind
    date = new Date(date.getTime() - date.getTimezoneOffset() * -60000);
    const start = startDateFormatter.format(date);
    date.setDate(date.getDate() + 6);
    const end = endDateFormatter.format(date);
    return `${start} - ${end}`;
  };

  return (
    <Link
      className="group outline-none"
      to="/timesheets/$id"
      params={{ id: String(props.id) }}
    >
      <Card className="group-focus:ring-1 ring-ring outline-none">
        <CardHeader>
          <CardTitle className="truncate">
            {props.weekStart ? getWeekRange(props.weekStart) : "Undated"}
          </CardTitle>
          <div className="text-sm text-muted-foreground">{props.slug}</div>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="flex items-center justify-between">
            <StatusBadge status={props.status} />
            <div className="flex items-center gap-2 border-none p-0">
              <ClockIcon className="w-4 h-4 text-muted-foreground" />
              {props.totalHours}h
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
