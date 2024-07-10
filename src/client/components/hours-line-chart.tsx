import {
  profileQueryOptions,
  timesheetsQueryOptions,
  type Profile,
} from '@/client/api-caller'
import { ContractorAvatar } from '@/client/components/contractor-avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/client/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/client/components/ui/chart'
import {
  formatDateRange,
  formatRangeStart,
  getWeekRange,
} from '@/client/components/utils'
import { ArrowTrendingUpIcon, ClockIcon } from '@heroicons/react/16/solid'
import { useQueries, useQuery } from '@tanstack/react-query'
import { compareAsc } from 'date-fns'
import { CartesianGrid, Line, LineChart, XAxis, type DotProps } from 'recharts'

export function HoursLineChart() {
  const timesheetsQuery = useQuery(timesheetsQueryOptions())
  const profilesQuery = useQueries({
    queries:
      timesheetsQuery.data?.map((t) => profileQueryOptions(t.contractorId)) ??
      [],
    combine: (results) => ({
      data: results.reduce<Record<string, Profile>>((acc, curr) => {
        if (curr.data) acc[curr.data.id] = curr.data
        return acc
      }, {}),
      isSuccess: results.every((r) => r.isSuccess),
    }),
  })

  if (!timesheetsQuery.isSuccess || !profilesQuery.isSuccess) {
    return null
  }

  const formattedTimesheets = timesheetsQuery.data
    .reduce<{ weekStart: string; [key: string]: string | number }[]>(
      (acc, timesheet) => {
        const index = acc.findIndex((t) => t.weekStart === timesheet.weekStart)
        const weekStart = timesheet.weekStart

        if (!weekStart) return acc
        if (index === -1) {
          acc.push({ weekStart, [timesheet.contractorId]: timesheet.hours })
          return acc
        }
        acc[index]![timesheet.contractorId] = timesheet.hours
        return acc
      },
      [],
    )
    .sort((tA, tB) =>
      compareAsc(new Date(tA.weekStart), new Date(tB.weekStart)),
    )
  const firstWeekStart = formattedTimesheets[0]?.weekStart

  const uniqueContractorIds = [
    ...new Set(timesheetsQuery.data.map((timesheet) => timesheet.contractorId)),
  ]
  const chartConfig = uniqueContractorIds.reduce<ChartConfig>(
    (acc, curr, idx) => {
      acc[curr] = {
        label: <>{profilesQuery.data[curr]?.firstName}</>,
        color: `hsl(var(--chart-${idx + 1}))`,
      }
      return acc
    },
    {},
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2">
          <ClockIcon className="h-4 w-4" />
          Hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={formattedTimesheets}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="weekStart"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(weekStart) => {
                const weekRange = getWeekRange(weekStart)
                return formatRangeStart(weekRange.from)
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(weekStart) => {
                    const weekRange = getWeekRange(weekStart)
                    return formatDateRange(weekRange)
                  }}
                />
              }
            />
            {uniqueContractorIds.map((contractorId) => (
              <Line
                key={contractorId}
                dataKey={contractorId}
                type="monotone"
                stroke={`var(--color-${contractorId})`}
                strokeWidth={2}
                isAnimationActive={false}
                dot={
                  <ContractorDot
                    imageUrl={profilesQuery.data[contractorId]?.imageUrl}
                    firstWeekStart={firstWeekStart}
                  />
                }
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

interface ContractorDotProps extends DotProps {
  imageUrl: string
  firstWeekStart: string
  payload: {
    weekStart: string
  }
}

function ContractorDot(props: ContractorDotProps) {
  if (props.payload.weekStart === props.firstWeekStart) {
    return (
      <image
        clipPath="inset(0% round 15px)"
        x={props.cx! - 10}
        y={props.cy! - 10}
        width={20}
        height={20}
        xlinkHref={props.imageUrl}
      />
    )
  }
}
