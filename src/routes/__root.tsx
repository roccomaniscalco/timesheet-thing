import { Button } from "@/components/ui/button";
import type { ApiType } from "@/server/api";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { PlusIcon } from "@heroicons/react/16/solid";
import { useMutation } from "@tanstack/react-query";
import { Outlet, createRootRoute, useNavigate } from "@tanstack/react-router";
import { hc } from "hono/client";

const { api } = hc<ApiType>("/");

export const Route = createRootRoute({
  component: () => <RootLayout />,
});

function RootLayout() {
  return (
    <>
      <Header />
      <main className="p-6 flex flex-col gap-6 max-w-6xl mx-auto">
        <Outlet />
      </main>
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
  const navigate = useNavigate();
  const { mutate: createTimesheet, isPending: isCreatingTimesheet } =
    useMutation({
      mutationKey: ["create-timesheet"],
      mutationFn: async () => {
        const res = await api.contractor.timesheets.$post();
        if (!res.ok) throw new Error("Failed to create timesheet");
        return res.json();
      },
      onSuccess: (data) => {
        navigate({
          to: "/timesheets/$id",
          params: { id: String(data.id) },
        });
      },
    });

  return (
    <Button
      disabled={isCreatingTimesheet}
      className="flex gap-2"
      size="sm"
      onClick={() => createTimesheet()}
    >
      New Timesheet
      <PlusIcon className="w-4 h-4" />
    </Button>
  );
}
