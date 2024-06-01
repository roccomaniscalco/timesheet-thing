import { Outlet, createRootRoute } from "@tanstack/react-router";
import tunnel from "tunnel-rat";

export const Route = createRootRoute({
  component: () => <RootLayout />,
});

function RootLayout() {
  return (
    <>
      <Header />
      <main className="fixed inset-0 max-w-7xl mx-auto h-[calc(100vh-56px)] mt-14">
        <Outlet />
      </main>
    </>
  );
}

export const headerActionTunnel = tunnel();
export const headerBreadcrumbTunnel = tunnel();

function Header() {
  return (
    <header className="fixed top-0 w-full z-10 bg-background/70 backdrop-blur border-border border-b">
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
