import {
  api,
  historyQueryOptions,
  timesheetQueryOptions,
  type Task,
} from "@/client/api-caller";
import { StatusBadge } from "@/client/components/status-badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/client/components/ui/avatar";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/client/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Separator } from "@/client/components/ui/separator";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  cn,
  formatCurrency,
  formatDateRange,
  getWeekRange,
} from "@/client/components/utils";
import {
  headerActionTunnel,
  headerBreadcrumbTunnel,
} from "@/client/routes/__root.js";
import {
  CONTRACTOR_STATUS,
  WEEKDAY,
  type ContractorStatus,
  type Weekday,
} from "@/constants";
import { taskFormSchema, type TaskForm } from "@/validation";
import { UserButton } from "@clerk/clerk-react";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/16/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { compareDesc, formatDistanceToNowStrict, startOfWeek } from "date-fns";
import { useEffect } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

export const Route = createFileRoute("/timesheets/$id")({
  component: Timesheet,
});

function Timesheet() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: timesheet } = useQuery(timesheetQueryOptions(id));

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
        <StatusSelect />
      </headerActionTunnel.In>

      <ResizablePanelGroup direction="horizontal" className="h-screen">
        <ResizablePanel className="pr-4" defaultSize={70}>
          <Card>
            <CardHeader className="flex-row gap-5 justify-between">
              <CardHeader className="p-0 min-w-0">
                <CardTitle>Task Details</CardTitle>
                <CardDescription className="truncate">
                  Log your work for the week.
                </CardDescription>
              </CardHeader>
              <WeekPicker weekStart={timesheet?.weekStart} />
            </CardHeader>

            <CardContent className="px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-40 capitalize">Day</TableHead>
                    <TableHead className="w-full">Task</TableHead>
                    <TableHead className="min-w-40">Hours</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <CreateTaskRow />
                </TableBody>
              </Table>
              {WEEKDAY.map((day) => (
                <TaskTable
                  day={day}
                  tasks={timesheet?.tasksByDay[day]}
                  key={day}
                />
              ))}
            </CardContent>
          </Card>
        </ResizablePanel>

        <ResizableHandle withHandle />
        <ResizablePanel className="pl-4" defaultSize={30}>
          <div className="flex flex-col gap-4">
            {/* <ContractorCard /> */}
            <TimesheetOverviewCard />
            <HistoryCard />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}

function StatusSelect() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: timesheet } = useQuery(timesheetQueryOptions(id));

  const queryClient = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: async (toStatus: ContractorStatus) => {
      const res = await api.contractor.timesheets[":id"].status.$put({
        param: { id },
        json: { toStatus },
      });
      if (!res.ok) throw new Error("Failed to update status");
      return await res.json();
    },
    onSuccess: (historyEntry) => {
      // Update status in timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined;
        return { ...prev, status: historyEntry.toStatus };
      });
      // Update status in history cache
      queryClient.setQueryData(historyQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined;
        return [...prev, historyEntry];
      });
    },
  });

  // Optimistically update status while mutation is pending
  const status = statusMutation.isPending
    ? statusMutation.variables
    : timesheet?.status;

  return (
    <Select
      value={status}
      onValueChange={(status) =>
        statusMutation.mutate(status as ContractorStatus)
      }
    >
      <SelectTrigger className="capitalize pl-1 gap-2">
        {status ? <SelectValue /> : <Skeleton className="w-24 h-[26px]" />}
      </SelectTrigger>
      <SelectContent align="end">
        {CONTRACTOR_STATUS.map((status) => (
          <SelectItem value={status} key={status} className="capitalize">
            <StatusBadge status={status} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TimesheetOverviewCard() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: timesheet } = useQuery(timesheetQueryOptions(id));
  const totalHours = timesheet?.tasks.reduce((acc, t) => acc + t.hours, 0);

  return (
    <Card>
      <CardHeader className="bg-accent border-b">
        <CardTitle>Timesheet Overview</CardTitle>
        <CardDescription>Calculated from logged tasks.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <ul className="grid gap-3 text-sm">
          <li>
            <h4 className="text-sm font-semibold">Payment</h4>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Hourly Rate</span>
            {timesheet?.rate === undefined ? (
              <Skeleton className="w-12 h-5" />
            ) : (
              <span className="tabular-nums">
                {formatCurrency(timesheet.rate)}
              </span>
            )}
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Hours</span>
            {totalHours === undefined ? (
              <Skeleton className="w-8 h-5" />
            ) : (
              <span className="tabular-nums">× {totalHours}</span>
            )}
          </li>
          <li>
            <Separator className="my-1" />
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Amount</span>
            {timesheet === undefined || totalHours === undefined ? (
              <Skeleton className="w-20 h-5" />
            ) : (
              <span className="tabular-nums">
                {formatCurrency(totalHours * timesheet.rate)}
              </span>
            )}
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function HistoryCard() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: history } = useQuery({
    ...historyQueryOptions(id),
    select: (history) =>
      history.sort((a, b) =>
        compareDesc(new Date(a.createdAt), new Date(b.createdAt))
      ),
  });

  return (
    <Card className="@container">
      <CardHeader className="border-b">
        <CardTitle>Timesheet History</CardTitle>
        <CardDescription>Status changes and comments.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <ul className="gap-8 flex flex-col">
          {history?.map((entry) => (
            <li className="flex gap-4">
              <Avatar className="h-9 w-9 hidden @xs:flex">
                <AvatarImage src="/avatars/01.png" alt="Avatar" />
                <AvatarFallback>OM</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <CardDescription>
                  <span className="text-foreground">{entry.contractorId}</span>{" "}
                  {entry.description}{" "}
                  {formatDistanceToNowStrict(new Date(entry.createdAt), {
                    addSuffix: true,
                  })}
                </CardDescription>
                <div className="flex items-center gap-2">
                  <StatusBadge status={entry.fromStatus} dense />
                  <ArrowRightIcon className="w-3 h-3 text-muted-foreground" />
                  <StatusBadge status={entry.toStatus} dense />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ContractorCard() {
  return (
    <Card>
      <div className="flex justify-between gap-4">
        <CardHeader className="pr-0">
          <CardTitle>John Doe</CardTitle>
          <CardDescription>john@example.com</CardDescription>
        </CardHeader>
        <CardHeader className="pl-0">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </CardHeader>
      </div>
    </Card>
  );
}

type WeekPickerProps = {
  weekStart?: string | null;
};
export function WeekPicker(props: WeekPickerProps) {
  const { id } = useParams({ from: "/timesheets/$id" });
  const queryClient = useQueryClient();
  const weekStartMutation = useMutation({
    mutationFn: async (timesheet: { weekStart: string | null }) => {
      const res = await api.contractor.timesheets[":id"].$put({
        param: { id },
        json: timesheet,
      });
      if (!res.ok) throw new Error("Failed to update timesheet");
      return await res.json();
    },
    onSuccess: (updatedWeekStart) => {
      // Update weekStart in timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined;
        return { ...prev, weekStart: updatedWeekStart };
      });
    },
  });

  // Optimistically update week while mutation is pending
  const weekStart = weekStartMutation.isPending
    ? weekStartMutation.variables.weekStart
    : props.weekStart;
  // Convert weekStart to DateRange
  const week = weekStart ? getWeekRange(weekStart) : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal mt-0",
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
              weekStartMutation.mutate({ weekStart: null });
            } else {
              const weekStart = startOfWeek(day).toDateString();
              weekStartMutation.mutate({ weekStart });
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type TaskTableProps = {
  day: Weekday;
  tasks?: Task[];
};
function TaskTable(props: TaskTableProps) {
  if (!props.tasks) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-40 capitalize">{props.day}</TableHead>
          <TableHead className="w-full" />
          <TableHead className="min-w-40" />
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.tasks.map((task) => (
          <EditTaskRow task={task} key={task.id} />
        ))}
      </TableBody>
    </Table>
  );
}

type TaskRowProps = {
  task: Task;
  className?: string;
};
function EditTaskRow({ task, ...props }: TaskRowProps) {
  const { id } = useParams({ from: "/timesheets/$id" });
  const queryClient = useQueryClient();
  const form = useForm<TaskForm>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      weekday: task.weekday,
      name: task.name,
      hours: task.hours,
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (taskForm: TaskForm) => {
      const res = await api.contractor.timesheets.tasks.$patch({
        json: {
          ...taskForm,
          timesheetId: task.timesheetId,
          id: task.id,
        },
      });
      if (!res.ok) throw new Error("Failed to update task");
      return await res.json();
    },
    onSuccess: async (updatedTask) => {
      // Update task in timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined;
        const taskIdx = prev.tasks.findIndex((t) => t.id === updatedTask.id);
        return { ...prev, tasks: prev.tasks.with(taskIdx, updatedTask) };
      });
      // Reset form after successful update
      form.reset(updatedTask);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await api.contractor.timesheets.tasks[":id"].$delete({
        param: { id: String(task.id) },
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return await res.json();
    },
    onSuccess: (deletedTaskId) => {
      // Remove deleted task from timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined;
        return {
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== deletedTaskId),
        };
      });
    },
  });

  return (
    <BaseTaskRow
      className={props.className}
      form={form}
      actionItem={
        form.formState.isDirty ? (
          <Button
            variant="outline"
            size="icon"
            onClick={form.handleSubmit((data) =>
              updateTaskMutation.mutate(data)
            )}
          >
            <CheckIcon className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            className="invisible group-hover/row:visible"
            variant="destructive"
            size="icon"
            onClick={() => deleteTaskMutation.mutate()}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        )
      }
    />
  );
}

function CreateTaskRow() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const queryClient = useQueryClient();
  const form = useForm<TaskForm>({
    resolver: zodResolver(taskFormSchema),
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskForm: TaskForm) => {
      const res = await api.contractor.timesheets.tasks.$patch({
        json: { ...taskForm, timesheetId: Number(id) },
      });
      if (!res.ok) throw new Error("Failed to create task");
      return await res.json();
    },
    onSuccess: (newTask) => {
      // Add new task to timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined;
        return { ...prev, tasks: [...prev.tasks, newTask] };
      });
    },
  });

  // Reset row after successful form submission
  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      form.reset();
    }
  }, [form.formState.isSubmitSuccessful]);

  return (
    <BaseTaskRow
      form={form}
      actionItem={
        <Button
          variant="outline"
          size="icon"
          onClick={form.handleSubmit((task) => createTaskMutation.mutate(task))}
        >
          <PlusIcon className="w-4 h-4" />
        </Button>
      }
    />
  );
}

type BaseTaskTableRowProps = {
  form: UseFormReturn<TaskForm>;
  className?: string;
  actionItem?: React.ReactNode;
};
function BaseTaskRow({ form, ...props }: BaseTaskTableRowProps) {
  return (
    <Form {...form}>
      <TableRow className={props.className}>
        <TableCell className="min-w-40">
          <FormField
            control={form.control}
            name="weekday"
            render={({ field }) => (
              <FormItem>
                <Select
                  key={form.formState.isSubmitSuccessful.toString()}
                  defaultValue={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="capitalize data-[placeholder]:normal-case aria-invalid:ring-destructive">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WEEKDAY.map((day) => (
                      <SelectItem key={day} value={day} className="capitalize">
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    key={form.formState.isSubmitSuccessful.toString()}
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
                    key={form.formState.isSubmitSuccessful.toString()}
                    type="number"
                    placeholder="Input hours"
                    step={0.25}
                    defaultValue={field.value}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value);
                      field.onChange(isNaN(hours) ? undefined : hours);
                    }}
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell>{props.actionItem}</TableCell>
      </TableRow>
    </Form>
  );
}
