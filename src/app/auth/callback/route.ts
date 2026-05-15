import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // 1. Capture the 'next' parameter — only allow relative paths to prevent open redirect
  const rawNext = requestUrl.searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') ? rawNext : '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )
    
    // 2. Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('[auth/callback] Code exchange failed:', exchangeError.message)
      return NextResponse.redirect(new URL('/auth/login?error=link_expired', request.url))
    }

    // 3. Redirect to the requested 'next' page (e.g., /auth/reset-password)
    return NextResponse.redirect(new URL(next, request.url))
  }

  // Fallback if no code is present
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
