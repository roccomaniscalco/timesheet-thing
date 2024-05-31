import { Outlet, createRootRoute } from "@tanstack/react-router";
import tunnel from "tunnel-rat";

export const Route = createRootRoute({
  component: () => <RootLayout />,
});

function RootLayout() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto h-screen">
        <Outlet />
      </main>
    </>
  );
}

export const headerActionTunnel = tunnel();
export const headerBreadcrumbTunnel = tunnel();

function Header() {
  return (
    <header className="absolute inset-x-0 z-10 bg-background/70 backdrop-blur border-border border-b">
      <div className="flex justify-between items-center gap-6 px-4 h-14 max-w-7xl mx-auto">
        <div className="flex-1">
          <headerBreadcrumbTunnel.Out />
        </div>
        <div className="flex gap-2">
          <headerActionTunnel.Out />
        </div>
      </div>
    </header>
  );
}
