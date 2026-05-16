import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/recovery
 *
 * Receives the access_token + refresh_token from the password-reset email hash
 * and sets the session server-side via cookies.
 *
 * Why server-side? @supabase/ssr's createBrowserClient hardcodes flowType:'pkce',
 * which makes _getSessionFromURL throw "Not a valid PKCE flow url" for implicit
 * hash tokens, and can cause browser-side setSession() to fail in some environments.
 * Setting the session server-side bypasses this entirely.
 */
export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json()

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const response = NextResponse.json({ ok: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Invalid or expired recovery tokens' },
        { status: 401 }
      )
    }

    return response
  } catch (err: any) {
    console.error('[api/auth/recovery]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
