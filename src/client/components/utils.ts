import { clsx, type ClassValue } from 'clsx'
import { endOfWeek, formatDistanceToNowStrict } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const RangeStart = Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
})
const RangeEnd = Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})
export function formatDateRange(dateRange: DateRange) {
  return `${RangeStart.format(dateRange.from)} - ${RangeEnd.format(dateRange.to)}`
}

export function getWeekRange(weekStart: string) {
  let date = new Date(weekStart)
  // Fix timezone offset that causes date to be a day behind
  date = new Date(date.getTime() - date.getTimezoneOffset() * -60000)
  return { from: date, to: endOfWeek(date) } satisfies DateRange
}

const USDollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})
export function formatCurrency(amount: number) {
  return USDollar.format(amount)
}

export function formatDistanceAgo(date: Date) {
  const distanceToNow = formatDistanceToNowStrict(date, { addSuffix: true })
  if (distanceToNow.includes(' 0 seconds')) {
    return 'just now'
  }
  return distanceToNow
}
