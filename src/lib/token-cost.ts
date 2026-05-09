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

export function estimateAnthropicCostUsd(usage?: TokenUsage | null, model = '') {
  if (!usage) return 0

  const isOpus = model.toLowerCase().includes('opus')
  const inputPrice = isOpus ? TOKEN_PRICING.opusInputPerMTok : TOKEN_PRICING.inputPerMTok
  const outputPrice = isOpus ? TOKEN_PRICING.opusOutputPerMTok : TOKEN_PRICING.outputPerMTok
  const cacheWritePrice = isOpus ? inputPrice * 1.25 : TOKEN_PRICING.cacheWritePerMTok
  const cacheReadPrice = isOpus ? inputPrice * 0.1 : TOKEN_PRICING.cacheReadPerMTok

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
