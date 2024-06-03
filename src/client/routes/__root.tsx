import { Outlet, createRootRoute } from '@tanstack/react-router'
import tunnel from 'tunnel-rat'

export const Route = createRootRoute({
  component: () => <RootLayout />
})

function RootLayout() {
  return (
    <>
      <Header />
      <main className="fixed inset-0 mx-auto mt-16 h-[calc(100vh-64px)] max-w-7xl">
        <Outlet />
      </main>
    </>
  )
}

export const headerActionTunnel = tunnel()
export const headerBreadcrumbTunnel = tunnel()

function Header() {
  return (
    <header className="fixed top-0 z-10 w-full border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-6">
        <div className="flex-1">
          <headerBreadcrumbTunnel.Out />
        </div>
        <div className="flex items-center gap-2">
          <headerActionTunnel.Out />
        </div>
      </div>
    </header>
  )
}
