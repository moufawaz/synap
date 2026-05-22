export type ThemeMode = 'dark' | 'light'

export type ThemeColors = {
  bg: string
  surface: string
  elevated: string
  border: string
  text: string
  muted: string
  dim: string
  spark: string
  sparkSoft: string
  pulse: string
  flame: string
  cyan: string
  danger: string
  dangerSoft: string
}

export const colors: Record<ThemeMode, ThemeColors> = {
  dark: {
    bg: '#050507',
    surface: '#0E0E12',
    elevated: '#15151B',
    border: 'rgba(255,255,255,0.08)',
    text: '#F8FAFC',
    muted: '#94A3B8',
    dim: '#64748B',
    spark: '#BB5CF6',
    sparkSoft: 'rgba(187,92,246,0.16)',
    pulse: '#10B981',
    flame: '#F97316',
    cyan: '#06B6D4',
    danger: '#EF4444',
    dangerSoft: 'rgba(239,68,68,0.14)',
  },
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    elevated: '#EEF2F7',
    border: 'rgba(15,23,42,0.10)',
    text: '#0F172A',
    muted: '#475569',
    dim: '#64748B',
    spark: '#A855F7',
    sparkSoft: 'rgba(168,85,247,0.13)',
    pulse: '#0F766E',
    flame: '#EA580C',
    cyan: '#0284C7',
    danger: '#DC2626',
    dangerSoft: 'rgba(220,38,38,0.12)',
  },
}
