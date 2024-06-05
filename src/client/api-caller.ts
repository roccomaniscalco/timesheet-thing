import type { Weekday } from '@/constants'
import type { ApiRoutesType } from '@/server/api-routes'
import { queryOptions } from '@tanstack/react-query'
import { hc, type InferResponseType } from 'hono/client'

export const { api } = hc<ApiRoutesType>('/')

export type Timesheets = InferResponseType<typeof api.timesheets.$get, 200>
export type Timesheet = InferResponseType<
  (typeof api.timesheets)[':id{[0-9]+}']['$get'],
  200
>
export type Task = Timesheet['tasks'][number]
export type HistoryEntry = Timesheet['history'][number]

export const timesheetsQueryOptions = () => {
  return queryOptions({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const res = await api.timesheets.$get()
      if (!res.ok) throw new Error('Failed to get timesheets')
      return res.json()
    },
  })
}

export const timesheetQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: ['get-timesheet', id],
    queryFn: async () => {
      const res = await api.timesheets[':id{[0-9]+}'].$get({
        param: { id }
      })
      if (!res.ok) throw new Error('Failed to get timesheet')
      return res.json()
    },
    select: (timesheet) => {
      return {
        ...timesheet,
        // Group tasks by weekday
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

export const profileQueryOptions = (id?: string | null) => {
  return queryOptions({
    queryKey: ['contractor', id],
    queryFn: async () => {
      const res = await api.users.profile[':id'].$get({
        param: { id: String(id) }
      })
      if (!res.ok) throw new Error('Failed to get contractor')
      return await res.json()
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 60
  })
}
