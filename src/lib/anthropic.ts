import Anthropic from '@anthropic-ai/sdk'

// Singleton client — reused across requests in the same Lambda execution
let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    _client = new Anthropic({ apiKey })
  }
  return _client
}

// ── Retry wrapper for transient Anthropic errors ──────────────────────────────
// Retries on: 500 (api_error), 529 (overloaded_error)
// Does NOT retry on: 4xx client errors, authentication errors
export async function withAnthropicRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  let lastErr: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      const status   = err?.status ?? err?.error?.status
      const errType  = err?.error?.type ?? err?.type ?? ''
      const retryable =
        status === 500 || status === 529 ||
        errType === 'api_error' || errType === 'overloaded_error'

      if (!retryable || attempt === maxRetries) throw err
      // Exponential back-off: 1 s, 2 s
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      console.warn(`[Anthropic] retry ${attempt + 1}/${maxRetries} after ${errType || status}`)
    }
  }
  throw lastErr
}

// ── Friendly user-facing error messages ──────────────────────────────────────
export function anthropicFriendlyError(err: any): string {
  const status  = err?.status ?? err?.error?.status
  const errType = err?.error?.type ?? err?.type ?? ''
  const raw     = (err?.message ?? err?.error?.message ?? String(err)).toLowerCase()

  if (errType === 'api_error'      || status === 500)
    return "Ion is having a moment. Give me a second and try again."
  if (errType === 'overloaded_error' || status === 529)
    return "I'm a bit busy right now. Give me a second and try again."
  if (errType === 'rate_limit_error' || status === 429)
    return "Too many requests. Please wait a moment and try again."
  if (errType === 'authentication_error' || raw.includes('invalid_api_key'))
    return "I'm having a configuration issue. Please contact support."
  if (raw.includes('credit balance') || raw.includes('billing') || raw.includes('quota'))
    return "I'm temporarily unavailable. Please try again in a moment."
  if (raw.includes('context_length') || raw.includes('too long'))
    return "That message is too long for me. Can you shorten it?"
  return "Something went wrong on my end. Try again in a moment."
}
