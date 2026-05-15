import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired — required by @supabase/ssr
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect all app routes
  if (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/chat') ||
      pathname.startsWith('/workout') ||
      pathname.startsWith('/nutrition') ||
      pathname.startsWith('/plan') ||
      pathname.startsWith('/progress') ||
      pathname.startsWith('/measurements') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/more') ||
      pathname.startsWith('/community') ||
      pathname.startsWith('/eating-out') ||
      pathname.startsWith('/form-check') ||
      pathname.startsWith('/grocery-list')) {
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect onboarding
  if (pathname.startsWith('/onboarding') && !user) {
    return NextResponse.redirect(new URL('/auth/signup?next=/onboarding', request.url))
  }

  // Redirect logged-in users away from auth pages
  if (user && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.jpg|manifest.json|OneSignalSDKWorker.js|ion-avatar.png|public/).*)',
  ],
}
