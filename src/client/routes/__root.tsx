import type { ApiType } from "@/server/api";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { hc } from "hono/client";
import tunnel from "tunnel-rat";

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

export const headerActionTunnel = tunnel();

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
        <div className="flex gap-2">
        <headerActionTunnel.Out />
        </div>
      </nav>
    </header>
  );
}
