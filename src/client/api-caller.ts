import type { Weekday } from '@/constants'
import type { ApiRoutesType } from '@/server/api-routes'
import { queryOptions } from '@tanstack/react-query'
import { hc, type InferResponseType } from 'hono/client'

export const { api } = hc<ApiRoutesType>('/')

export type Timesheet = InferResponseType<
  (typeof api.timesheets)[':id']['$get'],
  200
>
export type Task = Timesheet['tasks'][number]
export type HistoryEntry = Timesheet['history'][number]

export const timesheetQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: ['get-timesheet', id],
    queryFn: async () => {
      const res = await api.timesheets[':id'].$get({
        param: { id }
      })
      if (!res.ok) throw new Error('Failed to get timesheet')
      return res.json()
    },
    select: (timesheet) => {
      return {
        ...timesheet,
        // Group tasks by day
        tasksByDay: timesheet.tasks.reduce(
          (acc, curr) => {
            if (!acc[curr.weekday]) {
              acc[curr.weekday] = []
            }
            acc[curr.weekday].push(curr)
            return acc
          },
          {} as Record<Weekday, Task[]>
        )
      }
    }
  })
}

export const profileQueryOptions = (id?: number | null) => {
  return queryOptions({
    queryKey: ['contractor', id],
    queryFn: async () => {
      const res = await api.users[':id'].$get({
        param: { id: String(id) }
      })
      if (!res.ok) throw new Error('Failed to get contractor')
      return await res.json()
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 60
  })
}
