import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useRef, useState } from 'react'
import { reportError } from '@/lib/sentry'

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> { data: T; ts: number }

async function cacheRead<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`@sdc:${key}`)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.ts > ttlMs) return null // expired
    return entry.data
  } catch { return null }
}

/** Drop every cached screen payload. Call on ANY sign-out (logout, account
 *  deletion, expired session) — the keys aren't user-scoped, so otherwise the
 *  next account briefly sees the previous user's name, plan and tier. */
export async function clearDashboardCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const cached = keys.filter(k => k.startsWith('@sdc:'))
    if (cached.length) await AsyncStorage.multiRemove(cached)
  } catch {}
}

async function cacheWrite<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() }
    await AsyncStorage.setItem(`@sdc:${key}`, JSON.stringify(entry))
  } catch {}
}

interface AsyncDataOptions {
  /** AsyncStorage key — enables stale-while-revalidate caching */
  cacheKey?: string
  /** How long cached data stays fresh (default: 5 min) */
  cacheTtlMs?: number
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options?: AsyncDataOptions,
) {
  const [data, setData]       = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  /** HTTP status from the last failed apiFetch (if available). Lets screens
   *  branch on 401/404 to show a friendly empty state instead of error text. */
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const mounted = useRef(true)

  const cacheKey = options?.cacheKey
  const ttlMs    = options?.cacheTtlMs ?? DEFAULT_TTL_MS

  /** Full reload — shows loading spinner, updates cache on success */
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    setErrorStatus(null)
    try {
      const fresh = await loader()
      if (!mounted.current) return
      setData(fresh)
      if (cacheKey) cacheWrite(cacheKey, fresh)
    } catch (err: any) {
      if (mounted.current) {
        setError(err?.message || 'Something went wrong')
        setErrorStatus(typeof err?.status === 'number' ? err.status : null)
      }
      // Server errors are caught here and only shown in the UI, so Sentry
      // never saw them. Report 5xx; skip 4xx and offline noise.
      if (typeof err?.status === 'number' && err.status >= 500) {
        reportError(err, { cacheKey, status: err.status })
      }
    } finally {
      if (mounted.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  /** Silent background refresh — no loading spinner */
  const silentRefresh = useCallback(async () => {
    try {
      const fresh = await loader()
      if (!mounted.current) return
      setData(fresh)
      if (cacheKey) cacheWrite(cacheKey, fresh)
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mounted.current = true

    if (cacheKey) {
      // Stale-while-revalidate: show cached data immediately, refresh in background
      cacheRead<T>(cacheKey, ttlMs).then(cached => {
        if (!mounted.current) return
        if (cached !== null) {
          setData(cached)
          setLoading(false)
          // Background refresh so data stays fresh
          silentRefresh()
        } else {
          // Nothing cached — do a normal full load
          reload()
        }
      })
    } else {
      reload()
    }

    return () => { mounted.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload])

  return { data, loading, error, errorStatus, reload, silentRefresh, setData }
}
