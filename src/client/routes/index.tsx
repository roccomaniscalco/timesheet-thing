import { headerActionTunnel } from '@/client/routes/__root'
import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index
})

function Index() {
  return (
    <>
      <SignedIn>
        <Navigate to="/timesheets" />
      </SignedIn>
      <SignedOut>
        <headerActionTunnel.In>
          <SignInButton />
        </headerActionTunnel.In>
      </SignedOut>
    </>
  )
}
