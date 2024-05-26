import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ClerkProvider,
  SignedIn,
  UserButton
} from "@clerk/clerk-react";
import { ClockIcon } from "@heroicons/react/16/solid";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { hc, type InferResponseType } from "hono/client";
import type { ApiType } from "../functions/api/[[route]]";

const { api } = hc<ApiType>("/");
const queryClient = new QueryClient();

export default function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY!}>
      <QueryClientProvider client={queryClient}>
        <Header />
        <SignedIn>
          <TimesheetsGrid />
        </SignedIn>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function Header() {
  return (
    <header className="sticky top-0 bg-background/70 backdrop-blur border-border border-b">
      <nav className="flex justify-between items-center gap-6 px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <UserButton />
          <h1 className="text-xl font-semibold tracking-tight leading-none">
            Timesheets
          </h1>
        </div>
        <NewTimesheetButton />
      </nav>
    </header>
  );
}

function NewTimesheetButton() {
  const { mutate: createTimesheet } = useMutation({
    mutationKey: ["create-timesheet"],
    mutationFn: async () => {
      const res = await api.contractor.timesheet.$post();
      if (res.ok) return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["get-timesheets"] }),
  });

  return (
    <Button size="sm" onClick={() => createTimesheet()}>
      New Timesheet
    </Button>
  );
}

function TimesheetsGrid() {
  const { data: timesheets } = useQuery({
    queryKey: ["get-timesheets"],
    queryFn: async () => {
      const res = await api.contractor.timesheets.$get();
      if (res.ok) return res.json();
    },
  });

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {timesheets?.map((timesheet) => (
          <TimesheetCard key={timesheet.id} {...timesheet} />
        ))}
      </div>
    </div>
  );
}

type Timesheets = InferResponseType<typeof api.contractor.timesheets.$get, 200>;
type Timesheet = Timesheets[number];

interface TimesheetCardProps extends Timesheet {}
function TimesheetCard(props: TimesheetCardProps) {
  const startDateFormatter = Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  const endDateFormatter = Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const getWeekRange = (weekStart: string | null) => {
    if (!weekStart) return "-";

    let date = new Date(weekStart);

    // Fix timezone offset that causes date to be a day behind
    date = new Date(date.getTime() - date.getTimezoneOffset() * -60000);
    const start = startDateFormatter.format(date);
    date.setDate(date.getDate() + 6);
    const end = endDateFormatter.format(date);
    return `${start} - ${end}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">Weekly Timesheet</CardTitle>
        <div className="text-sm text-secondary-foreground">
          {getWeekRange(props.weekStart)}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex items-center justify-between">
          <StatusBadge status={props.status} />
          <div className="flex items-center gap-2 border-none p-0">
            <ClockIcon className="w-4 h-4" />
            {props.totalHours}h
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
