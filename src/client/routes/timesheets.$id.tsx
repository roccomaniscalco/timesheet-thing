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
import { cn, formatDateRange } from "@/client/components/utils";
import {
  headerActionTunnel,
  headerBreadcrumbTunnel,
} from "@/client/routes/__root.js";
import { UserButton } from "@clerk/clerk-react";
import { CalendarIcon } from "@heroicons/react/16/solid";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { endOfWeek, startOfWeek } from "date-fns";
import type { InferResponseType } from "hono";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

export const Route = createFileRoute("/timesheets/$id")({
  component: Timesheet,
});

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
        <WeekPicker />
      </headerActionTunnel.In>

      {timesheet && <TaskTable tasks={timesheet.tasks} />}
    </>
  );
}

export function WeekPicker() {
  const [selectedWeek, setSelectedWeek] = useState<DateRange | undefined>();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !selectedWeek && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedWeek ? (
            formatDateRange(selectedWeek)
          ) : (
            <span>Pick week</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-auto flex-col space-y-2 p-2"
        align="end"
      >
        <Calendar
          modifiers={{
            // @ts-expect-error
            selected: selectedWeek,
          }}
          onDayClick={(day, modifiers) => {
            if (modifiers.selected) {
              setSelectedWeek(undefined);
              return;
            }
            setSelectedWeek({
              from: startOfWeek(day),
              to: endOfWeek(day),
            });
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type Tasks = InferResponseType<
  (typeof api.contractor.timesheets)["$id"]["$get"],
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
