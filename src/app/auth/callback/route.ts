import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // 1. Capture the 'next' parameter from the URL, defaulting to '/dashboard'
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
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
    await supabase.auth.exchangeCodeForSession(code)
    
    // 3. Redirect to the requested 'next' page (e.g., /auth/reset-password)
    return NextResponse.redirect(new URL(next, request.url))
  }

  // Fallback if no code is present
  return NextResponse.redirect(new URL('/auth/login', request.url))
}