import {
  api,
  profileQueryOptions,
  timesheetsQueryOptions,
  type Profile,
  type Timesheets,
} from '@/client/api-caller'
import { ContractorAvatar } from '@/client/components/contractor-avatar'
import { StatusBadge } from '@/client/components/status-badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/client/components/ui/breadcrumb'
import { Button } from '@/client/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/client/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/client/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/client/components/ui/popover'
import { Progress } from '@/client/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/client/components/ui/table'
import {
  cn,
  formatCurrency,
  formatDateRange,
  formatRangeStart,
  getWeekRange,
} from '@/client/components/utils'
import {
  headerActionTunnel,
  headerBreadcrumbTunnel,
} from '@/client/routes/__root.js'
import { type Status } from '@/constants'
import { UserButton } from '@clerk/clerk-react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  BanknotesIcon,
  CalendarIcon,
  CheckIcon,
  ChevronUpDownIcon,
  ClockIcon,
  FunnelIcon,
  PaperAirplaneIcon,
  PlusIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/16/solid'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import { compareAsc } from 'date-fns'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/timesheets/')({
  component: TimesheetsPage,
})

function TimesheetsPage() {
  const timesheetsQuery = useQuery(timesheetsQueryOptions())
  const profilesQuery = useQueries({
    queries:
      [...new Set(timesheetsQuery.data?.map((t) => t.contractorId))]?.map(
        (contractorId) => profileQueryOptions(contractorId),
      ) ?? [],
    combine: (results) => ({
      data: results.reduce<Record<string, Profile>>((acc, curr) => {
        if (curr.data) {
          acc[curr.data.id] = curr.data
        }
        return acc
      }, {}),
      isSuccess: results.every((r) => r.isSuccess),
    }),
  })

  return (
    <div className="p-4 pt-8">
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

      {timesheetsQuery.isSuccess && profilesQuery.isSuccess && (
        <TimesheetTable
          timesheets={timesheetsQuery.data}
          profiles={profilesQuery.data}
        />
      )}
    </div>
  )
}

function NewTimesheetButton() {
  const navigate = useNavigate()
  const { mutate: createTimesheet, isPending: isCreatingTimesheet } =
    useMutation({
      mutationFn: async () => {
        const res = await api.timesheets.$post()
        if (!res.ok) throw new Error('Failed to create timesheet')
        return res.json()
      },
      onSuccess: (data) => {
        navigate({
          to: '/timesheets/$id',
          params: { id: String(data.id) },
        })
      },
    })

  return (
    <Button
      disabled={isCreatingTimesheet}
      className="flex gap-2"
      onClick={() => createTimesheet()}
    >
      New Timesheet
      <PlusIcon className="h-4 w-4" />
    </Button>
  )
}

function TimesheetGrid() {
  const { data: timesheets } = useQuery(timesheetsQueryOptions())

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {timesheets?.map((timesheet) => (
        <TimesheetCard key={timesheet.id} timesheet={timesheet} />
      ))}
    </div>
  )
}

type TimesheetCardProps = {
  timesheet: Timesheets[number]
}
function TimesheetCard({ timesheet }: TimesheetCardProps) {
  return (
    <Link
      className="group cursor-pointer outline-none"
      to="/timesheets/$id"
      params={{ id: String(timesheet.id) }}
    >
      <Card className="outline-none ring-ring group-focus:ring-1">
        <CardHeader>
          <CardTitle className="truncate">
            {timesheet.weekStart
              ? formatDateRange(getWeekRange(timesheet.weekStart))
              : 'Undated'}
          </CardTitle>
          <div className="text-sm text-muted-foreground">{timesheet.id}</div>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="flex items-center justify-between">
            <StatusBadge status={timesheet.status} />
            <div className="flex items-center gap-2 border-none p-0">
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
              {timesheet.tasks.reduce((acc, curr) => acc + curr.hours, 0)}h
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

type Timesheet = Timesheets[number]
type TimesheetWithProfile = Timesheet & { profile: Profile }

const columnHelper = createColumnHelper<TimesheetWithProfile>()
const columns = [
  columnHelper.accessor('id', {
    header: ({ column }) => (
      <Button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        variant="ghost"
        className="gap-1"
      >
        ID
        {column.getIsSorted() ? (
          column.getIsSorted() === 'asc' ? (
            <ArrowDownIcon className="h-4 w-4" />
          ) : (
            <ArrowUpIcon className="h-4 w-4" />
          )
        ) : (
          <ArrowsUpDownIcon className="h-4 w-4" />
        )}
      </Button>
    ),
    cell: (info) => (
      <div className="pl-4 text-muted-foreground">{info.getValue()}</div>
    ),
  }),
  columnHelper.accessor('weekStart', {
    header: ({ column }) => (
      <Button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        variant="ghost"
        className="gap-1"
      >
        Week of
        {column.getIsSorted() ? (
          column.getIsSorted() === 'asc' ? (
            <ArrowDownIcon className="h-4 w-4" />
          ) : (
            <ArrowUpIcon className="h-4 w-4" />
          )
        ) : (
          <ArrowsUpDownIcon className="h-4 w-4" />
        )}
      </Button>
    ),
    cell: (info) => {
      const weekStart = info.getValue()
      if (!weekStart) return <div className="pl-4">–</div>
      const weekRange = getWeekRange(weekStart)
      const formattedWeekStart = formatRangeStart(weekRange.from)
      return <div className="pl-4">{formattedWeekStart}</div>
    },
    sortingFn: (a, b) => {
      return compareAsc(
        new Date(a.getValue('weekStart')),
        new Date(b.getValue('weekStart')),
      )
    },
  }),
  columnHelper.accessor('profile', {
    header: 'Contractor',
    cell: (info) => {
      const contractorId = info.row.original.contractorId
      const profile = info.getValue()
      return (
        <div className="flex items-center gap-2">
          <ContractorAvatar id={contractorId} className="h-5 w-5" />
          <span>
            {profile.firstName} {profile.lastName}
          </span>
        </div>
      )
    },
  }),
  columnHelper.accessor('status', {
    header: () => <div className="w-28">Status</div>,
    cell: (info) => {
      const status = info.getValue()
      return <StatusBadge status={status} />
    },
  }),
  columnHelper.accessor('tasks', {
    header: () => <div className="text-right">Hours</div>,
    cell: (info) => {
      const tasks = info.getValue()
      const totalHours = tasks.reduce((acc, curr) => acc + curr.hours, 0)
      const approvedHours = info.row.original.approvedHours
      const progress = (totalHours / approvedHours) * 100
      const roundedProgress = Math.floor(progress / 25) * 25

      const progressColor = {
        0: '*:bg-violet-300 dark:*:bg-violet-950',
        25: '*:bg-violet-400 dark:*:bg-violet-900',
        50: '*:bg-violet-500 dark:*:bg-violet-700',
        75: '*:bg-violet-700 dark:*:bg-violet-500',
        100: '*:bg-violet-900 dark:*:bg-violet-300',
      }[roundedProgress]

      return (
        <div className="flex items-center justify-end gap-2 tabular-nums">
          {totalHours}
          <Progress
            value={progress}
            className={cn('w-8 bg-accent', progressColor)}
          />
        </div>
      )
    },
  }),
  columnHelper.accessor('rate', {
    header: () => <div className="pr-4 text-right">Pay</div>,
    cell: (info) => {
      const rate = info.getValue()
      const tasks = info.row.original.tasks
      const totalHours = tasks.reduce((acc, curr) => acc + curr.hours, 0)
      const pay = rate * totalHours
      return (
        <div className="pr-4 text-right tabular-nums">
          {formatCurrency(pay)}
        </div>
      )
    },
  }),
]

type TimesheetTableProps = {
  timesheets: Timesheets
  profiles: Record<string, Profile>
}
function TimesheetTable({ timesheets, profiles }: TimesheetTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])

  const timesheetsWithProfile = useMemo(() => {
    return timesheets.map((timesheet) => ({
      ...timesheet,
      profile: profiles[timesheet.contractorId] as Profile,
    }))
  }, [timesheets, profiles])

  const table = useReactTable({
    data: timesheetsWithProfile,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnFilters,
      sorting,
    },
  })

  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <FilterBuilder />
        {/* <StatusSelect
          items={STATUS}
          value={table.getColumn('status')?.getFilterValue() as Status}
          onValueChange={(status) => {
            table.getColumn('status')?.setFilterValue(status)
          }}
        /> */}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead className="text-nowrap" key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="cursor-pointer"
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() =>
                    navigate({
                      to: '/timesheets/$id',
                      params: { id: String(row.getValue('id')) },
                    })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="text-nowrap align-middle"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-8 text-center">
                  No timesheets found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function FilterBuilder() {
  const columns = [
    {
      Icon: CalendarIcon,
      label: 'Week of',
      value: 'week of',
    },
    {
      Icon: UserIcon,
      label: 'Contractor',
      value: 'contractor',
    },
    {
      Icon: PaperAirplaneIcon,
      label: 'Status',
      value: 'status',
    },
    {
      Icon: ClockIcon,
      label: 'Hours',
      value: 'hours',
    },
    {
      Icon: BanknotesIcon,
      label: 'Pay',
      value: 'pay',
    },
  ]

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="gap-2"
          role="combobox"
          aria-expanded={open}
        >
          <FunnelIcon className="h-4 w-4" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-fit p-0">
        <Command>
          <CommandInput placeholder="Filter..." kbd="f" />
          <CommandList>
            <CommandGroup>
              {columns.map((framework) => (
                <CommandItem
                  key={framework.value}
                  value={framework.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue)
                    setOpen(false)
                  }}
                >
                  <framework.Icon className="mr-2 h-4 w-4" />
                  {framework.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

type StatusSelectProps = {
  items: readonly Status[]
  value?: Status
  onValueChange: (status?: Status) => void
}
function StatusSelect(props: StatusSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={props.value ?? ''}
        onValueChange={(value) => props.onValueChange(value as Status)}
      >
        <SelectTrigger className="flex w-fit gap-2 pl-1 data-[placeholder]:pl-4">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent align="start">
          {props.items.map((item) => (
            <SelectItem value={item} key={item}>
              <StatusBadge status={item} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {props.value && (
        <Button
          size="icon"
          variant="outline"
          onClick={() => props.onValueChange()}
        >
          <XMarkIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
