import { api } from "@/client/api-caller";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/client/components/ui/breadcrumb";
import { Button } from "@/client/components/ui/button";
import { Calendar } from "@/client/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { cn, formatDateRange, getWeekRange } from "@/client/components/utils";
import {
  headerActionTunnel,
  headerBreadcrumbTunnel,
} from "@/client/routes/__root.js";
import { UserButton } from "@clerk/clerk-react";
import { CalendarIcon } from "@heroicons/react/16/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { startOfWeek } from "date-fns";
import type { InferResponseType } from "hono";

export const Route = createFileRoute("/timesheets/$id")({
  component: Timesheet,
});

function Timesheet() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: timesheet } = useQuery({
    queryKey: ["get-timesheet", id],
    queryFn: async () => {
      const res = await api.contractor.timesheets[":id"].$get({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to get timesheet");
      return res.json();
    },
  });

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
              <BreadcrumbLink asChild>
                <Link to="/timesheets">Timesheets</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{timesheet?.slug}</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
      </headerBreadcrumbTunnel.In>
      <headerActionTunnel.In>
        <WeekPicker weekStart={timesheet?.weekStart} />
      </headerActionTunnel.In>

      {timesheet && <TaskTable tasks={timesheet.tasks} />}
    </>
  );
}

type WeekPickerProps = {
  weekStart?: string | null;
};
export function WeekPicker(props: WeekPickerProps) {
  const { id } = useParams({ from: "/timesheets/$id" });
  const queryClient = useQueryClient();
  const timesheetMutation = useMutation({
    mutationFn: async (timesheet: { weekStart: string | null }) => {
      const res = await api.contractor.timesheets[":id"].$put({
        param: { id },
        json: timesheet,
      });
      if (!res.ok) throw new Error("Failed to update timesheet");
      return res.json();
    },
    onSettled: async () => {
      return await queryClient.invalidateQueries({
        queryKey: ["get-timesheet", id],
      });
    },
  });

  // Optimistically update week while mutation is pending
  const weekStart = timesheetMutation.isPending
    ? timesheetMutation.variables.weekStart
    : props.weekStart;
  // Convert weekStart to DateRange
  const week = weekStart ? getWeekRange(weekStart) : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start text-left font-normal",
            !week && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {week ? formatDateRange(week) : <span>Pick week</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-auto flex-col space-y-2 p-2"
        align="end"
      >
        <Calendar
          modifiers={{
            // @ts-expect-error
            selected: week,
          }}
          onDayClick={(day, modifiers) => {
            if (modifiers.selected) {
              timesheetMutation.mutate({ weekStart: null });
            } else {
              const weekStart = startOfWeek(day).toDateString();
              timesheetMutation.mutate({ weekStart });
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type Tasks = InferResponseType<
  (typeof api.contractor.timesheets)[":id"]["$get"],
  200
>["tasks"];

type TaskTableProps = {
  tasks: Tasks;
};
function TaskTable(props: TaskTableProps) {
  return (
    <Table>
      <TableCaption>A list of your recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Day</TableHead>
          <TableHead className="w-[50%]">Task</TableHead>
          <TableHead className="text-right">Hours</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell className="uppercase">{task.weekDay}</TableCell>
            <TableCell className="w-[50%]">{task.name}</TableCell>
            <TableCell className="text-right">{task.hours}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
