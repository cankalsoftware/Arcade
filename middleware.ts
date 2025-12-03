import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// this is a middleware that checks if the user is authenticated
const isProtectedRoute = createRouteMatcher([
  // '/space_invaders(.*)',
  // '/tetris(.*)',
  // '/pacman(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth()
  // if user not signed in and the route is protected, redirect to sign in
  if (!userId && isProtectedRoute(req)) {
    // Add custom logic to run before redirecting

    return redirectToSignIn()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}