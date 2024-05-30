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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/client/components/ui/form";
import { Input } from "@/client/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
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
import { WEEK_DAY } from "@/constants";
import { UserButton } from "@clerk/clerk-react";
import { CalendarIcon, PlusIcon } from "@heroicons/react/16/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { startOfWeek } from "date-fns";
import type { InferResponseType } from "hono";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
function TaskTable({ tasks }: TaskTableProps) {
  return (
    <>
      <Table>
        <TableCaption>Tasks logged for the selected timesheet.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-40">Weekday</TableHead>
            <TableHead className="w-full">Task</TableHead>
            <TableHead className="min-w-40">Hours</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TaskTableRow task={task} />
          ))}
          <TaskTableRow />
        </TableBody>
      </Table>
    </>
  );
}

const taskFormSchema = z.object({
  weekDay: z.enum(WEEK_DAY),
  task: z.string(),
  hours: z
    .number()
    .positive()
    .refine((v) => v % 0.25 === 0),
});

type Task = Tasks[number];
type TaskTableRowProps = {
  task?: Task;
};
function TaskTableRow({ task }: TaskTableRowProps) {
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      weekDay: task?.weekDay,
      task: task?.name ?? "",
      hours: task?.hours ?? 0,
    },
  });

  const onSubmit = (values: z.infer<typeof taskFormSchema>) => {
    console.log(values);
  };

  return (
    <Form {...form}>
      <TableRow>
        <TableCell className="min-w-40">
          <FormField
            control={form.control}
            name="weekDay"
            render={({ field }) => (
              <FormItem>
                <Select
                  defaultValue={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="uppercase data-[placeholder]:normal-case">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WEEK_DAY.map((day) => (
                      <SelectItem key={day} value={day} className="uppercase">
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="w-full">
          <FormField
            control={form.control}
            name="task"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Input task"
                    defaultValue={field.value}
                    onChange={field.onChange}
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="min-w-40">
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Input hours"
                    defaultValue={field.value}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="flex">
          <Button size="icon" onClick={form.handleSubmit(onSubmit)}>
            <PlusIcon className="w-4 h-4" />
          </Button>
        </TableCell>
      </TableRow>
    </Form>
  );
}
