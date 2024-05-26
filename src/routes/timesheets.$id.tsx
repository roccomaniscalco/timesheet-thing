import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/timesheets/$id')({
  component: () => <div>Hello /timesheets/$id!</div>
})