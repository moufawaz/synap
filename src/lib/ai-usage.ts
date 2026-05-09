import { estimateAnthropicCostUsd, type TokenUsage } from './token-cost'
import { createAdminClient } from './supabase-server'

export async function recordAiUsage(
  {
    userId,
    feature,
    model,
    usage,
  }: {
    userId: string
    feature: string
    model: string
    usage: TokenUsage
  }
) {
  const supabase = createAdminClient()
  const inputTokens = usage.input_tokens || 0
  const outputTokens = usage.output_tokens || 0
  const cacheWriteTokens = usage.cache_creation_input_tokens || 0
  const cacheReadTokens = usage.cache_read_input_tokens || 0
  const totalTokens = inputTokens + outputTokens + cacheWriteTokens + cacheReadTokens
  const estimatedCostUsd = estimateAnthropicCostUsd(usage, model)

  const { error } = await supabase.from('ai_usage_log').insert({
    user_id: userId,
    feature,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_write_tokens: cacheWriteTokens,
    cache_read_tokens: cacheReadTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: estimatedCostUsd,
  })

  if (error) {
    console.warn('[ai_usage_log] insert failed:', error.message)
  }

  return { inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens, totalTokens, estimatedCostUsd }
}
