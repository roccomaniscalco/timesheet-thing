import { Button } from "@/components/ui/button";
import type { ApiType } from "@/server/api";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { hc } from "hono/client";

const { api } = hc<ApiType>("/");

export const Route = createRootRoute({
  component: () => <RootLayout />,
});

function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 bg-background/70 backdrop-blur border-border border-b">
      <nav className="flex justify-between items-center gap-6 px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
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
  const qc = useQueryClient();
  const { mutate: createTimesheet } = useMutation({
    mutationKey: ["create-timesheet"],
    mutationFn: async () => {
      const res = await api.contractor.timesheet.$post();
      if (res.ok) return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["get-timesheets"] }),
  });

  return (
    <Button size="sm" onClick={() => createTimesheet()}>
      New Timesheet
    </Button>
  );
}
