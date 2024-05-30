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
import { taskFormSchema, type TaskForm } from "@/validation";
import { UserButton } from "@clerk/clerk-react";
import {
  CalendarIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/16/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { startOfWeek } from "date-fns";
import type { InferResponseType } from "hono";
import { useEffect } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

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
    select: (data) => {
      return {
        ...data,
        tasks: data.tasks.sort((a, b) => {
          return (
            // Sort by weekDay
            WEEK_DAY.indexOf(a.weekDay) - WEEK_DAY.indexOf(b.weekDay) ||
            // If weekDay is the same, sort by id
            a.id - b.id
          );
        }),
      };
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
  const { id } = useParams({ from: "/timesheets/$id" });
  const optimisticTasks = useMutationState({
    filters: { mutationKey: ["create-task"], status: "pending" },
    select: (mutation) => {
      return {
        ...(mutation.state.variables as TaskForm),
        timesheetId: Number(id),
        id: mutation.mutationId,
      };
    },
  });

  return (
    <Table>
      <TableCaption>Tasks logged for the selected timesheet.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-40">Day</TableHead>
          <TableHead className="w-full">Task</TableHead>
          <TableHead className="min-w-40">Hours</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        <NewTaskRow />
        {tasks.map((task) => (
          <TaskRow task={task} key={task.id} />
        ))}
        {optimisticTasks.map((task) => (
          <TaskRow
            task={task}
            key={task.id}
            className="animate-in slide-in-from-top"
          />
        ))}
      </TableBody>
    </Table>
  );
}

type Task = Tasks[number];

type TaskRowProps = {
  task: Task;
  className?: string;
};
function TaskRow({ task, ...props }: TaskRowProps) {
  const { id } = useParams({ from: "/timesheets/$id" });
  const queryClient = useQueryClient();
  const form = useForm<TaskForm>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      weekDay: task.weekDay,
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
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["get-timesheet", id] });
      form.reset(data[0]);
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
    onSuccess: async () => {
      return await queryClient.invalidateQueries({
        queryKey: ["get-timesheet", id],
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

function NewTaskRow() {
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
    onSuccess: async () => {
      return await queryClient.invalidateQueries({
        queryKey: ["get-timesheet", id],
      });
    },
  });

  // Reset row after successful submission
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
            name="weekDay"
            render={({ field }) => (
              <FormItem>
                <Select
                  key={form.formState.isSubmitSuccessful.toString()}
                  defaultValue={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="uppercase data-[placeholder]:normal-case aria-invalid:ring-destructive">
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
