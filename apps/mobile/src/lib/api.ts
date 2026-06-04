import { supabase } from './supabase'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.synapfit.app'

/** Extra options layered on top of fetch's RequestInit. */
type ApiFetchOptions = RequestInit & {
  /** Abort the request after this many ms and throw a friendly timeout error.
   *  Defaults to 45s; long AI endpoints (plan generation) pass a larger value. */
  timeoutMs?: number
}

export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { timeoutMs = 45_000, ...fetchInit } = init
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers = new Headers(fetchInit.headers)
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // Time the request out so a stalled network never spins forever — the UI gets
  // a real error it can surface and offer a retry on.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchInit,
      headers,
      signal: controller.signal,
    })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('That took too long. Please check your connection and try again.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}
