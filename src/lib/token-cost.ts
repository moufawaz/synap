export type TokenUsage = {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

const MILLION = 1_000_000

export const TOKEN_PRICING = {
  inputPerMTok: Number(process.env.ANTHROPIC_INPUT_USD_PER_MTOK || 3),
  outputPerMTok: Number(process.env.ANTHROPIC_OUTPUT_USD_PER_MTOK || 15),
  cacheWritePerMTok: Number(process.env.ANTHROPIC_CACHE_WRITE_USD_PER_MTOK || 3.75),
  cacheReadPerMTok: Number(process.env.ANTHROPIC_CACHE_READ_USD_PER_MTOK || 0.3),
  opusInputPerMTok: Number(process.env.ANTHROPIC_OPUS_INPUT_USD_PER_MTOK || 5),
  opusOutputPerMTok: Number(process.env.ANTHROPIC_OPUS_OUTPUT_USD_PER_MTOK || 25),
}

// Per-model list prices ($/MTok) for models priced differently from the defaults above.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
}

export function estimateAnthropicCostUsd(usage?: TokenUsage | null, model = '') {
  if (!usage) return 0

  const modelKey = model.toLowerCase()
  const listed = Object.entries(MODEL_PRICING).find(([id]) => modelKey.startsWith(id))?.[1]
  const isOpus = !listed && modelKey.includes('opus')
  const inputPrice = listed?.input ?? (isOpus ? TOKEN_PRICING.opusInputPerMTok : TOKEN_PRICING.inputPerMTok)
  const outputPrice = listed?.output ?? (isOpus ? TOKEN_PRICING.opusOutputPerMTok : TOKEN_PRICING.outputPerMTok)
  const scaleCache = !!listed || isOpus
  const cacheWritePrice = scaleCache ? inputPrice * 1.25 : TOKEN_PRICING.cacheWritePerMTok
  const cacheReadPrice = scaleCache ? inputPrice * 0.1 : TOKEN_PRICING.cacheReadPerMTok

  const input = usage.input_tokens || 0
  const output = usage.output_tokens || 0
  const cacheWrite = usage.cache_creation_input_tokens || 0
  const cacheRead = usage.cache_read_input_tokens || 0

  return (
    (input / MILLION) * inputPrice +
    (output / MILLION) * outputPrice +
    (cacheWrite / MILLION) * cacheWritePrice +
    (cacheRead / MILLION) * cacheReadPrice
  )
}

export function formatUsd(value: number) {
  if (value < 0.01 && value > 0) return `$${value.toFixed(4)}`
  return `$${value.toFixed(2)}`
}
