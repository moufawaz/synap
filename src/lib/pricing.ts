// Single source of truth for all SYNAP pricing — update here only

export const PRICING = {
  pro: {
    monthly: { sar: 39.99, variantId: process.env.NEXT_PUBLIC_LS_PRO_MONTHLY_ID || '1600605' },
    annual:  { sar: 319.99, variantId: process.env.NEXT_PUBLIC_LS_PRO_ANNUAL_ID || '1602045', savingsSar: 159.99 },
  },
  elite: {
    monthly: { sar: 69.99, variantId: process.env.NEXT_PUBLIC_LS_ELITE_MONTHLY_ID || '1602017' },
    annual:  { sar: 559.99, variantId: process.env.NEXT_PUBLIC_LS_ELITE_ANNUAL_ID || '1602053', savingsSar: 279.99 },
  },
} as const

export type PlanKey = keyof typeof PRICING
export type BillingPeriod = 'monthly' | 'annual'
