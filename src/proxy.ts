import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/chat', '/plan', '/workout', '/nutrition', '/eating-out', '/grocery-list', '/form-check', '/measurements', '/progress', '/settings', '/admin', '/more', '/community']

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ── Stamp country cookie from Vercel's geo header ──────────────
  const country = req.headers.get('x-vercel-ip-country') || ''
  if (country) {
    res.cookies.set('synap_country', country.toUpperCase(), {
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
      httpOnly: false,
    })
  }

  // Use getUser() (server-validated) instead of getSession() (JWT-only)
  const { data: { user } } = await supabase.auth.getUser()
  const path = req.nextUrl.pathname

  // Redirect unauthenticated users away from protected routes
  if (!user && PROTECTED_ROUTES.some(r => path.startsWith(r))) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(loginUrl)
  }

  // Protect onboarding
  if (!user && path.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/auth/signup?next=/onboarding', req.url))
  }

  // Redirect logged-in users away from auth pages
  if (user && (path.startsWith('/auth/login') || path.startsWith('/auth/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
