import { api } from "@/client/api-caller";
import { StatusBadge } from "@/client/components/status-badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/client/components/ui/breadcrumb";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { formatDateRange, getWeekRange } from "@/client/components/utils";
import {
  headerActionTunnel,
  headerBreadcrumbTunnel,
} from "@/client/routes/__root.js";
import { UserButton } from "@clerk/clerk-react";
import { ClockIcon, PlusIcon } from "@heroicons/react/16/solid";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import type { InferResponseType } from "hono";

export const Route = createFileRoute("/timesheets/")({
  component: TimesheetsPage,
});

function TimesheetsPage() {
  return (
    <>
      <headerBreadcrumbTunnel.In>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <UserButton />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Timesheets</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </headerBreadcrumbTunnel.In>
      <headerActionTunnel.In>
        <NewTimesheetButton />
      </headerActionTunnel.In>
      <TimesheetGrid />
    </>
  );
}

function NewTimesheetButton() {
  const navigate = useNavigate();
  const { mutate: createTimesheet, isPending: isCreatingTimesheet } =
    useMutation({
      mutationFn: async () => {
        const res = await api.contractor.timesheets.$post();
        if (!res.ok) throw new Error("Failed to create timesheet");
        return res.json();
      },
      onSuccess: (data) => {
        navigate({
          to: "/timesheets/$id",
          params: { id: String(data.id) },
        });
      },
    });

  return (
    <Button
      disabled={isCreatingTimesheet}
      className="flex gap-2"
      onClick={() => createTimesheet()}
    >
      New Timesheet
      <PlusIcon className="w-4 h-4" />
    </Button>
  );
}

function TimesheetGrid() {
  const { data: timesheets } = useQuery({
    queryKey: ["get-timesheets"],
    queryFn: () => api.contractor.timesheets.$get()
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
  return (
    <Link
      className="group outline-none"
      to="/timesheets/$id"
      params={{ id: String(props.id) }}
    >
      <Card className="group-focus:ring-1 ring-ring outline-none">
        <CardHeader>
          <CardTitle className="truncate">
            {props.weekStart
              ? formatDateRange(getWeekRange(props.weekStart))
              : "Undated"}
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
