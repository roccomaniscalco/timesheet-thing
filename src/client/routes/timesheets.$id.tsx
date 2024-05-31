import { api, timesheetQueryOptions, type Task } from "@/client/api-caller";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import {
  cn,
  formatCurrency,
  formatDateRange,
  getWeekRange,
} from "@/client/components/utils";
import {
  headerBreadcrumbTunnel,
  headerActionTunnel,
} from "@/client/routes/__root.js";
import { STATUSES, WEEKDAYS, type Status, type Weekday } from "@/constants";
import { taskFormSchema, type TaskForm } from "@/validation";
import { UserButton } from "@clerk/clerk-react";
import {
  BanknotesIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/16/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Link,
  createFileRoute,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { startOfWeek } from "date-fns";
import { useEffect } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

const timesheetSearchSchema = z.object({
  tab: z.enum(["overview", "history"]).catch("overview"),
});
type Tab = z.infer<typeof timesheetSearchSchema>["tab"];

export const Route = createFileRoute("/timesheets/$id")({
  component: Timesheet,
  validateSearch: (search) => timesheetSearchSchema.parse(search),
});

function Timesheet() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { tab } = useSearch({ from: "/timesheets/$id" });
  const navigate = useNavigate({ from: "/timesheets/$id" });

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
        <ResizablePanel className="pr-4" defaultSize={75}>
          <Card>
            <CardHeader className="flex-row  gap-5 justify-between">
              <CardHeader className="p-0 min-w-0">
                <CardTitle>Timesheet Details</CardTitle>
                <CardDescription className="truncate">
                  Log completed work for the week.
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
              {WEEKDAYS.map((day) => (
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
        <ResizablePanel className="pl-4" defaultSize={25}>
          <Tabs
            value={tab}
            onValueChange={(newTab) =>
              navigate({ search: { tab: newTab as Tab } })
            }
          >
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="flex flex-col gap-4 mt-4">
              <ContractorCard />
              <TotalHoursCard />
              <TotalAmountCard />
            </TabsContent>
            <TabsContent value="history">Change your history here.</TabsContent>
          </Tabs>
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
    mutationFn: async (status: Status) => {
      const res = await api.contractor.timesheets[":id"].status.$put({
        param: { id },
        json: { status },
      });
      if (!res.ok) throw new Error("Failed to update status");
      return await res.json();
    },
    onSuccess: ({ newStatus }) => {
      // Update status in timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined;
        return { ...prev, status: newStatus };
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
      onValueChange={(status) => statusMutation.mutate(status as Status)}
    >
      <SelectTrigger className="capitalize pl-1 gap-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((status) => (
          <SelectItem value={status} key={status} className="capitalize">
            <StatusBadge status={status} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ContractorCard() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: timesheet } = useQuery(timesheetQueryOptions(id));

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
      <CardContent className="text-sm text-nowrap space-y-1">
        <div className="flex items-center gap-2 justify-between">
          <p className="text-muted-foreground">Hourly rate:</p>
          {timesheet?.rate === undefined ? (
            <Skeleton className="w-8 h-5" />
          ) : (
            <p>{formatCurrency(timesheet.rate)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 justify-between">
          <p className="text-muted-foreground">Billable time:</p>
          {timesheet?.approvedHours === undefined ? (
            <Skeleton className="w-8 h-5" />
          ) : (
            <p>{timesheet.approvedHours}hr/week</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TotalHoursCard() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: totalHours } = useQuery({
    ...timesheetQueryOptions(id),
    select: (data) => data.tasks.reduce((acc, task) => acc + task.hours, 0),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-5">
        <CardDescription className="flex items-center gap-2 justify-between">
          Total hours
          <ClockIcon className="w-4 h-4" />
        </CardDescription>
        {totalHours === undefined ? (
          <Skeleton className="w-24 h-8" />
        ) : (
          <CardTitle className="text-2xl">{totalHours}hr</CardTitle>
        )}
      </CardHeader>
    </Card>
  );
}

function TotalAmountCard() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: totalAmount } = useQuery({
    ...timesheetQueryOptions(id),
    select: (data) =>
      data.tasks.reduce((acc, task) => acc + task.hours * data.rate, 0),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-5">
        <CardDescription className="flex items-center gap-2 justify-between">
          Total pay
          <BanknotesIcon className="w-4 h-4" />
        </CardDescription>
        {totalAmount === undefined ? (
          <Skeleton className="w-24 h-8" />
        ) : (
          <CardTitle className="text-2xl">
            {formatCurrency(totalAmount)}
          </CardTitle>
        )}
      </CardHeader>
    </Card>
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
    mutationKey: ["update-task"],
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
    mutationKey: ["delete-task"],
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
    mutationKey: ["create-task"],
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
                    {WEEKDAYS.map((day) => (
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
