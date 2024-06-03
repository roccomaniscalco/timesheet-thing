import {
  api,
  profileQueryOptions,
  timesheetQueryOptions,
  type HistoryEntry,
  type Task
} from '@/client/api-caller'
import { ContractorAvatar } from '@/client/components/contractor-avatar'
import { StatusBadge } from '@/client/components/status-badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/client/components/ui/breadcrumb'
import { Button } from '@/client/components/ui/button'
import { Calendar } from '@/client/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/client/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/client/components/ui/form'
import { Input } from '@/client/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/client/components/ui/popover'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/client/components/ui/resizable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/client/components/ui/select'
import { Separator } from '@/client/components/ui/separator'
import { Skeleton } from '@/client/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/client/components/ui/table'
import {
  cn,
  formatCurrency,
  formatDateRange,
  formatDistanceAgo,
  getWeekRange
} from '@/client/components/utils'
import {
  headerActionTunnel,
  headerBreadcrumbTunnel
} from '@/client/routes/__root.js'
import {
  CONTRACTOR_STATUS,
  WEEKDAY,
  type ContractorStatus,
  type Weekday
} from '@/constants'
import { UserButton, useUser } from '@clerk/clerk-react'
import {
  ArrowRightIcon,
  BanknotesIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/16/solid'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useParams } from '@tanstack/react-router'
import { compareDesc, startOfWeek } from 'date-fns'
import { useEffect, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

export const Route = createFileRoute('/timesheets/$id')({
  component: TimesheetPage
})

function TimesheetPage() {
  return (
    <>
      <HeaderContent />
      <ResizablePanels
        left={<TaskDetailsCard />}
        right={
          <>
            <OverviewCard />
            <HistoryCard />
          </>
        }
      />
    </>
  )
}

// Header contents

function HeaderContent() {
  const { id } = useParams({ from: '/timesheets/$id' })
  const { data: timesheet } = useQuery(timesheetQueryOptions(id))

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
        <StatusSelect />
      </headerActionTunnel.In>
    </>
  )
}

function StatusSelect() {
  const { id } = useParams({ from: '/timesheets/$id' })
  const { data: timesheet } = useQuery(timesheetQueryOptions(id))

  const queryClient = useQueryClient()
  const statusMutation = useMutation({
    mutationFn: async (toStatus: ContractorStatus) => {
      const res = await api.contractor.timesheets[':id'].status.$put({
        param: { id },
        json: { toStatus }
      })
      if (!res.ok) throw new Error('Failed to update status')
      return await res.json()
    },
    onSuccess: (historyEntry) => {
      // Update status in timesheet cache
      // And add history entry to timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined
        return {
          ...prev,
          status: historyEntry.toStatus,
          history: [historyEntry, ...prev.history]
        }
      })
    }
  })

  // Optimistically update status while mutation is pending
  const status = statusMutation.isPending
    ? statusMutation.variables
    : timesheet?.status

  return (
    <Select
      value={status}
      onValueChange={(status) =>
        statusMutation.mutate(status as ContractorStatus)
      }
    >
      <SelectTrigger className="gap-2 pl-1 capitalize">
        {status ? <SelectValue /> : <Skeleton className="h-[26px] w-24" />}
      </SelectTrigger>
      <SelectContent align="end">
        {CONTRACTOR_STATUS.map((status) => (
          <SelectItem value={status} key={status} className="capitalize">
            <StatusBadge status={status} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function WeekPicker() {
  const { id } = useParams({ from: '/timesheets/$id' })
  const { data: timesheet } = useQuery(timesheetQueryOptions(id))

  const { user } = useUser()
  const isManager = user?.publicMetadata.role === 'manager'

  const queryClient = useQueryClient()
  const weekStartMutation = useMutation({
    mutationFn: async (timesheet: { weekStart: string | null }) => {
      const res = await api.contractor.timesheets[':id'].$put({
        param: { id },
        json: timesheet
      })
      if (!res.ok) throw new Error('Failed to update timesheet')
      return await res.json()
    },
    onSuccess: (updatedWeekStart) => {
      // Update weekStart in timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined
        return { ...prev, weekStart: updatedWeekStart }
      })
    }
  })

  // Optimistically update week while mutation is pending
  const weekStart = weekStartMutation.isPending
    ? weekStartMutation.variables.weekStart
    : timesheet?.weekStart
  // Convert weekStart to DateRange
  const week = weekStart ? getWeekRange(weekStart) : null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'mt-0 justify-start text-left font-normal',
            !week && 'text-muted-foreground'
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
            selected: week
          }}
          onDayClick={(day, modifiers) => {
            if (isManager) return
            if (modifiers.selected) {
              weekStartMutation.mutate({ weekStart: null })
            } else {
              const weekStart = startOfWeek(day).toDateString()
              weekStartMutation.mutate({ weekStart })
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// Resizable layout

type ResizablePanelsProps = {
  left: React.ReactNode
  right: React.ReactNode
}
function ResizablePanels(props: ResizablePanelsProps) {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId="timesheet-resizable-panels"
    >
      <ResizablePanel
        className="p-6"
        style={{ overflow: 'auto' }}
        minSize={60}
        defaultSize={70}
      >
        {props.left}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        className="p-6"
        style={{ overflow: 'auto' }}
        collapsible
        minSize={20}
        defaultSize={30}
      >
        <div className="flex flex-col gap-6 overflow-hidden">{props.right}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

// Right contents

function OverviewCard() {
  const { id } = useParams({ from: '/timesheets/$id' })
  const { data: timesheet } = useQuery(timesheetQueryOptions(id))
  const totalHours = timesheet?.tasks.reduce((acc, t) => acc + t.hours, 0)

  return (
    <Card>
      <ContractorCard />
      <CardContent>
        <ul className="grid gap-3 text-sm">
          <li>
            <h4 className="text-sm font-semibold">Payment Summary</h4>
          </li>
          <li className="flex items-center justify-between gap-2">
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground">Hourly Rate</span>
            {timesheet?.rate === undefined ? (
              <Skeleton className="h-5 w-12" />
            ) : (
              <span className="tabular-nums">
                {formatCurrency(timesheet.rate)}
              </span>
            )}
          </li>
          <li className="flex items-center justify-between gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground">Total Hours</span>
            {totalHours === undefined ? (
              <Skeleton className="h-5 w-8" />
            ) : (
              <span className="tabular-nums">
                <span className="text-muted-foreground">×</span> {totalHours}
              </span>
            )}
          </li>
          <li>
            <Separator className="my-1" />
          </li>
          <li className="flex items-center justify-between gap-2">
            <BanknotesIcon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground">Total Pay</span>
            {timesheet === undefined || totalHours === undefined ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="tabular-nums">
                {formatCurrency(totalHours * timesheet.rate)}
              </span>
            )}
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}

function ContractorCard() {
  const { id } = useParams({ from: '/timesheets/$id' })
  const { data: timesheet } = useQuery(timesheetQueryOptions(id))
  const profile = useQuery(profileQueryOptions(timesheet?.contractorId))

  return (
    <Card className="m-2 mb-6 rounded-sm bg-accent/50">
      <div className="flex gap-4 p-4">
        <CardHeader className="p-0">
          <ContractorAvatar id={timesheet?.contractorId} />
        </CardHeader>
        {profile.data ? (
          <CardHeader className="p-0">
            <CardTitle>
              {profile.data.first_name} {profile.data.last_name}
            </CardTitle>
            <CardDescription>{profile.data.email}</CardDescription>
          </CardHeader>
        ) : (
          <CardHeader className="p-0">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48 pt-2" />
          </CardHeader>
        )}
      </div>
    </Card>
  )
}

function HistoryCard() {
  const { id } = useParams({ from: '/timesheets/$id' })
  const history = useQuery({
    ...timesheetQueryOptions(id),
    select: (timesheet) =>
      timesheet.history.sort((a, b) =>
        compareDesc(new Date(a.createdAt), new Date(b.createdAt))
      )
  })

  return (
    <Card className="@container">
      <CardHeader>
        <CardTitle>Timesheet History</CardTitle>
        <CardDescription>Status changes and comments.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-8">
          {history.data
            ? history.data.map((item) => (
                <HistoryListItem key={item.id} historyItem={item} />
              ))
            : [...Array(3).keys()].map((i) => (
                <li key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-56" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </li>
              ))}
        </ul>
      </CardContent>
    </Card>
  )
}

type HistoryItemProps = {
  historyItem: HistoryEntry
}
function HistoryListItem({ historyItem }: HistoryItemProps) {
  const profile = useQuery(profileQueryOptions(historyItem.contractorId))

  return (
    <li className="flex gap-4">
      <ContractorAvatar
        id={historyItem.contractorId}
        className="hidden h-8 w-8 @xs:flex"
      />
      <div className="space-y-2">
        <CardDescription>
          <span className="text-foreground">{profile.data?.first_name}</span>{' '}
          {historyItem.description}{' '}
          <DistanceAgo date={new Date(historyItem.createdAt)} />
        </CardDescription>
        <div className="flex items-center gap-2">
          <StatusBadge status={historyItem.fromStatus} dense />
          <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
          <StatusBadge status={historyItem.toStatus} dense />
        </div>
      </div>
    </li>
  )
}

type DistanceAgoProps = {
  date: Date
}
function DistanceAgo(props: DistanceAgoProps) {
  const [distanceAgo, setDistanceAgo] = useState(formatDistanceAgo(props.date))

  // Update distanceAgo every second
  useEffect(() => {
    const interval = setInterval(() => {
      setDistanceAgo(formatDistanceAgo(props.date))
    }, 1000)
    return () => clearInterval(interval)
  }, [props.date])

  return <span className="tabular-nums">{distanceAgo}</span>
}

// Left contents

function TaskDetailsCard() {
  const { id } = useParams({ from: '/timesheets/$id' })
  const { data: timesheet } = useQuery(timesheetQueryOptions(id))

  const { user } = useUser()
  const isManager = user?.publicMetadata.role === 'manager'

  return (
    <Card>
      <div className="flex justify-between">
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          <CardDescription>Logged work for the week.</CardDescription>
        </CardHeader>
      </div>

      <CardContent className="px-0">
        <Table>
          <TableBody>{!isManager && <CreateTaskRow />}</TableBody>
        </Table>
        {WEEKDAY.map((day) => (
          <TaskTable day={day} tasks={timesheet?.tasksByDay[day]} key={day} />
        ))}
      </CardContent>
    </Card>
  )
}

type TaskTableProps = {
  day: Weekday
  tasks?: Task[]
}
function TaskTable(props: TaskTableProps) {
  if (!props.tasks) {
    return null
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-40 pl-6 capitalize">
            {props.day}
          </TableHead>
          <TableHead className="w-full">Task ({props.tasks.length})</TableHead>
          <TableHead className="min-w-40">
            Hours ({props.tasks.reduce((acc, curr) => (acc += curr.hours), 0)})
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.tasks.map((task) => (
          <EditTaskRow task={task} key={task.id} />
        ))}
      </TableBody>
    </Table>
  )
}

const taskFormSchema = z.object({
  weekday: z.enum(WEEKDAY, { message: 'Day is required' }),
  name: z
    .string({ message: 'Task is required' })
    .min(1, { message: 'Task is required' }),
  hours: z
    .number({ message: 'Hours is required' })
    .positive({ message: 'Hours must be positive' })
    .refine((v) => v % 0.25 === 0, {
      message: 'Hours must be in 0.25 increments'
    })
})
type TaskForm = z.infer<typeof taskFormSchema>

function CreateTaskRow() {
  const { id } = useParams({ from: '/timesheets/$id' })
  const queryClient = useQueryClient()
  const form = useForm<TaskForm>({
    resolver: zodResolver(taskFormSchema)
  })

  const createTaskMutation = useMutation({
    mutationFn: async (taskForm: TaskForm) => {
      const res = await api.contractor.timesheets.tasks.$patch({
        json: { ...taskForm, timesheetId: Number(id) }
      })
      if (!res.ok) throw new Error('Failed to create task')
      return await res.json()
    },
    onSuccess: (newTask) => {
      // Add new task to timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined
        return { ...prev, tasks: [...prev.tasks, newTask] }
      })
    }
  })

  // Reset row after successful form submission
  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      form.reset()
    }
  }, [form.formState.isSubmitSuccessful])

  return (
    <BaseTaskRow
      form={form}
      actionItem={
        <Button
          variant="outline"
          size="icon"
          onClick={form.handleSubmit((task) => createTaskMutation.mutate(task))}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      }
    />
  )
}

type EditTaskRowProps = {
  task: Task
}
function EditTaskRow({ task }: EditTaskRowProps) {
  const { id } = useParams({ from: '/timesheets/$id' })
  const queryClient = useQueryClient()
  const form = useForm<TaskForm>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      weekday: task.weekday,
      name: task.name,
      hours: task.hours
    }
  })

  const updateTaskMutation = useMutation({
    mutationFn: async (taskForm: TaskForm) => {
      const res = await api.contractor.timesheets.tasks.$patch({
        json: {
          ...taskForm,
          timesheetId: task.timesheetId,
          id: task.id
        }
      })
      if (!res.ok) throw new Error('Failed to update task')
      return await res.json()
    },
    onSuccess: async (updatedTask) => {
      // Update task in timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined
        const taskIdx = prev.tasks.findIndex((t) => t.id === updatedTask.id)
        return { ...prev, tasks: prev.tasks.with(taskIdx, updatedTask) }
      })
      // Reset form after successful update
      form.reset(updatedTask)
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await api.contractor.timesheets.tasks[':id'].$delete({
        param: { id: String(task.id) }
      })
      if (!res.ok) throw new Error('Failed to delete task')
      return await res.json()
    },
    onSuccess: (deletedTaskId) => {
      // Remove deleted task from timesheet cache
      queryClient.setQueryData(timesheetQueryOptions(id).queryKey, (prev) => {
        if (prev === undefined) return undefined
        return {
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== deletedTaskId)
        }
      })
    }
  })

  return (
    <BaseTaskRow
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
            <CheckIcon className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="invisible group-hover/row:visible"
            variant="destructive"
            size="icon"
            onClick={() => deleteTaskMutation.mutate()}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        )
      }
    />
  )
}

type BaseTaskTableRowProps = {
  form: UseFormReturn<TaskForm>
  actionItem?: React.ReactNode
}
function BaseTaskRow({ form, ...props }: BaseTaskTableRowProps) {
  const { user } = useUser()
  const isManager = user?.publicMetadata.role === 'manager'

  return (
    <Form {...form}>
      <TableRow>
        <TableCell className="min-w-40 pl-6">
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
                    <SelectTrigger className="capitalize aria-invalid:ring-destructive data-[placeholder]:normal-case">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WEEKDAY.map((day) => (
                      <SelectItem
                        disabled={isManager}
                        key={day}
                        value={day}
                        className="capitalize"
                      >
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
                    readOnly={isManager}
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
                    readOnly={isManager}
                    key={form.formState.isSubmitSuccessful.toString()}
                    type="number"
                    placeholder="Input hours"
                    step={0.25}
                    defaultValue={field.value}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value)
                      field.onChange(isNaN(hours) ? undefined : hours)
                    }}
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="pr-6">{!isManager && props.actionItem}</TableCell>
      </TableRow>
    </Form>
  )
}
