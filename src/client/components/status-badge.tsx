import { cn } from '@/client/components/utils'
import type { Status } from '@/constants'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PencilIcon,
} from '@heroicons/react/16/solid'

const variantClass = {
  draft:
    'border-transparent bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50',
  submitted:
    'border-transparent bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-50',
  approved:
    'border-transparent bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-50',
  rejected:
    'border-transparent bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-50',
}

const icon = {
  draft: <PencilIcon className="h-4 w-4" />,
  submitted: <PaperAirplaneIcon className="h-4 w-4" />,
  approved: <CheckCircleIcon className="h-4 w-4" />,
  rejected: <ExclamationTriangleIcon className="h-4 w-4" />,
}

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: Status
  iconOnly?: boolean
}
export function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1 py-0.5 text-xs font-semibold capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantClass[status],
        className,
        props.iconOnly && "px-0.5"
      )}
      {...props}
    >
      {icon[status]}
      {!props.iconOnly && status}
    </div>
  )
}
