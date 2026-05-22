// Server-only Supabase helpers
// Import ONLY in Server Components or Route Handlers.

import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { createClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Anon key + user JWT: respects RLS. Use for auth-gated reads/writes.
export async function createServerClient() {
  const cookieStore = await cookies()
  return createSSRServerClient(
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
}

// Service-role key: bypasses RLS entirely.
// Use ONLY in Route Handlers / cron jobs. NEVER expose to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function getBearerToken(req?: Request): string | null {
  const bearer = req?.headers.get('authorization') || req?.headers.get('Authorization')
  return bearer?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
}

export async function createRouteClient(req?: Request) {
  const token = getBearerToken(req)

  if (token) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    )
  }

  return createServerClient()
}

export async function getAuthenticatedUser(req?: Request): Promise<{ user: User | null; error: unknown | null }> {
  const token = getBearerToken(req)
  if (token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data, error } = await supabase.auth.getUser(token)
    return { user: data.user, error }
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}
