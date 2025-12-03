'use client'

import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Button } from "@/components/ui/button"
import ConvexClientProvider from './ConvexClientProvider'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <header className="sticky top-0 z-50 flex justify-end items-center p-4 gap-4 h-16 backdrop-blur-md bg-black/50 border-b border-white/10">
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="ghost"
              className='mr-4 text-white hover:text-blue-400 hover:bg-white/10'>
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="ghost"
              className='mr-4 text-white hover:text-blue-400 hover:bg-white/10'>
              Sign Up
            </Button>
          </SignUpButton>
        </SignedOut>

        <SignedIn>
          <div className='p-2 w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 border border-blue-200'>
            <UserButton />
          </div>
        </SignedIn>
      </header>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ClerkProvider>
  )
}