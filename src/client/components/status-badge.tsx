import { cn } from "@/client/components/utils";
import type { Status } from "@/constants";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PencilIcon,
} from "@heroicons/react/16/solid";

const variantClass = {
  draft:
    "border-transparent bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
  submitted:
    "border-transparent bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-50",
  approved:
    "border-transparent bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-50",
  rejected:
    "border-transparent bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-50",
};

const icon = {
  draft: <PencilIcon className="w-4 h-4" />,
  submitted: <PaperAirplaneIcon className="w-4 h-4" />,
  approved: <CheckCircleIcon className="w-4 h-4" />,
  rejected: <ExclamationTriangleIcon className="w-4 h-4" />,
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: Status | null;
  dense?: boolean;
}
export function StatusBadge({
  className,
  status,
  dense,
  ...props
}: StatusBadgeProps) {
  if (!status)
    return (
      <div
        className={cn(
          "inline-flex items-center rounded border px-2 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 gap-1.5 capitalize",
          dense && "p-0.5 border-transparent bg-none text-muted-foreground",
          className
        )}
        {...props}
      >
        none
      </div>
    );

  return (
    <div
      className={cn(
        "inline-flex items-center rounded border px-2 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 gap-1.5 capitalize",
        variantClass[status],
        dense && "p-0.5",
        className
      )}
      {...props}
    >
      {!dense && icon[status]}
      {status}
    </div>
  );
}
