import {
  api,
  timesheetsQueryOptions,
  type Timesheets,
} from '@/client/api-caller'
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
  cn,
  formatDateRange,
  formatRangeStart,
  getWeekRange,
} from '@/client/components/utils'
import {
  headerActionTunnel,
  headerBreadcrumbTunnel,
} from '@/client/routes/__root.js'
import { UserButton } from '@clerk/clerk-react'
import { ClockIcon, PlusIcon, XMarkIcon } from '@heroicons/react/16/solid'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/client/components/ui/table'
import { STATUS, type Status } from '@/constants'
import { ContractorAvatar } from '@/client/components/contractor-avatar'
import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from '@/client/components/ui/select'

export const Route = createFileRoute('/timesheets/')({
  component: TimesheetsPage,
})

function TimesheetsPage() {
  const { data: timesheets } = useQuery(timesheetsQueryOptions())

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

      {timesheets && <TimesheetTable timesheets={timesheets} />}
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

const columnHelper = createColumnHelper<Timesheet>()
const columns = [
  columnHelper.accessor('id', { header: 'ID' }),
  columnHelper.accessor('weekStart', {
    header: 'Week Of',
    cell: (info) => {
      const weekStart = info.getValue()
      if (!weekStart) return '–'
      const weekRange = getWeekRange(weekStart)
      const formattedWeekStart = formatRangeStart(weekRange.from)
      return formattedWeekStart
    },
  }),
  columnHelper.accessor('contractor', {
    header: 'Contractor',
    cell: (info) => {
      const contractor = info.getValue()
      return (
        <div className="flex items-center gap-2">
          <ContractorAvatar id={contractor.id} className="h-[26px] w-[26px]" />
          <span>{contractor.id}</span>
        </div>
      )
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue()
      return <StatusBadge status={status} />
    },
  }),
  columnHelper.accessor('tasks', {
    header: 'Hours',
    cell: (info) => {
      const tasks = info.getValue()
      const totalHours = tasks.reduce((acc, curr) => acc + curr.hours, 0)
      return totalHours
    },
  }),
]

type TimesheetTableProps = {
  timesheets: Timesheets
}
function TimesheetTable(props: TimesheetTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const table = useReactTable({
    data: props.timesheets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  })

  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <StatusSelect
          items={STATUS}
          value={table.getColumn('status')?.getFilterValue() as Status}
          onValueChange={(status) => {
            table.getColumn('status')?.setFilterValue(status)
          }}
        />
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
              <></>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
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
        <SelectTrigger className="w-fit gap-2 pl-1 data-[placeholder]:pl-4">
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
