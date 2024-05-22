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
  useQuery,
} from "@tanstack/react-query";
import { hc } from "hono/client";
import type { ApiType } from "../functions/api/[[route]]";

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
  const { data: timesheets } = useQuery({
    queryKey: ["timesheets"],
    queryFn: async () => {
      const res = await api.timesheets.$get();
      if (!res.ok) {
        console.log(res.status);
        console.log(res.statusText);
        console.log(await res.json());
        throw new Error("Failed to fetch timesheets");
      }
      return res.json();
    },
  });

  return (
    <div>
      <h2>Timesheets</h2>
      <ul>
        {timesheets?.map((timesheet) => (
          <li key={timesheet.id}>{timesheet.weekOf}</li>
        ))}
      </ul>
    </div>
  );
}
