import { Outlet, createRootRoute } from "@tanstack/react-router";
import tunnel from "tunnel-rat";

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
export const headerBreadcrumbTunnel = tunnel();

function Header() {
  return (
    <header className="sticky top-0 bg-background/70 backdrop-blur border-border border-b">
      <div className="flex justify-between items-center gap-6 px-6 h-14 max-w-6xl mx-auto">
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
