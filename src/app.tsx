import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { hc } from "hono/client";
import type { ApiType } from "../functions/api/[[route]]";
import { Button } from "@/components/ui/button";

const { api } = hc<ApiType>("/");
const queryClient = new QueryClient();

export default function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY!}>
      <QueryClientProvider client={queryClient}>
        <Header />
        <SignedIn>
          <Timesheets />
        </SignedIn>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function Header() {
  return (
    <header>
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}

function Timesheets() {
  const { data: timesheets, error } = useQuery({
    queryKey: ["get-timesheets"],
    queryFn: async () => {
      const res = await api.contractor.timesheets.$get();
      if (res.ok) return res.json();
    },
  });

  const { mutate: createTImesheet } = useMutation({
    mutationKey: ["create-timesheet"],
    mutationFn: async () => {
      const res = await api.contractor.timesheet.$post();
      if (res.ok) return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["get-timesheets"] }),
  });

  return (
    <div>
      <h2>Timesheets</h2>
      <ul>
        {timesheets?.map((timesheet) => (
          <li key={timesheet.id}>{timesheet.id}</li>
        ))}
      </ul>
      <Button onClick={() => createTImesheet()}> create timesheet</Button>
    </div>
  );
}
