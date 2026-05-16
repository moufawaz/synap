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
 *
 * The response also returns the fresh access_token + refresh_token so the
 * browser client can call setSession() directly to load the session into its
 * in-memory state — avoids the problem where getSession() reads stale null
 * from the client's internal cache rather than the newly-set cookie.
 */
export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json()

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

    const cookieStore = await cookies()

    // Collect cookies written by setSession() so we can apply them to the
    // final response (the one whose JSON body we control).
    const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(c => pendingCookies.push(c))
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

    // Build the response with the fresh session tokens in the body.
    // The browser client will call setSession() with these to load the session
    // into memory (so updateUser() works without a page reload).
    const response = NextResponse.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    // Apply all cookies that setSession() generated.
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    })

    return response
  } catch (err: any) {
    console.error('[api/auth/recovery]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
