import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─────────────────────────────────────────
      // SYNAP brand palette
      // ─────────────────────────────────────────
      colors: {
        // Core
        'void':            '#0A0A0A',  // page bg
        'void-card':       '#0E0E0E',  // card bg
        'void-elevated':   '#121212',  // elevated surfaces
        'void-rim':        '#1A1A1A',  // rim / chip bg
        'charcoal':        'var(--void)',
        'charcoal-card':   'var(--void-card)',
        'charcoal-light':  'var(--void-elevated)',

        // Violet spark
        'spark': {
          DEFAULT: '#BB5CF6',
          light:   '#D88BFF',
          glow:    '#CC80FF',
          deep:    '#9B3CD6',
          core:    '#7B2FFF',
        },
        'violet': {
          DEFAULT: '#BB5CF6',
          light:   '#D88BFF',
        },
        'cyan': '#06B6D4',

        // Silver/chrome neutrals
        'silver': {
          DEFAULT: '#E2E8F0',
          muted:   '#94A3B8',
          dim:     '#64748B',
          deep:    '#475569',
        },
        'light': {
          DEFAULT: 'var(--silver)',
          muted:   'var(--silver-muted)',
        },

        // System accents
        'pulse':    '#108981',  // live / learning indicators
        'flame':    '#F97316',  // intensity
        'mercury':  '#C8C8D8',  // chrome midtone
      },

      // ─────────────────────────────────────────
      // Typography
      // ─────────────────────────────────────────
      fontFamily: {
        heading:  ['var(--font-heading)', 'Exo 2', 'system-ui', 'sans-serif'],
        display:  ['var(--font-heading)', 'Exo 2', 'system-ui', 'sans-serif'],
        body:     ['var(--font-body)',    'Inter',  'system-ui', 'sans-serif'],
        sans:     ['var(--font-body)',    'Inter',  'system-ui', 'sans-serif'],
        mono:     ['var(--font-mono)',    'JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      letterSpacing: {
        'brand':       '0.18em',
        'brand-wide':  '0.28em',
        'brand-xwide': '0.32em',
      },

      // ─────────────────────────────────────────
      // Glow shadows
      // ─────────────────────────────────────────
      boxShadow: {
        'spark':       '0 0 20px rgba(187, 92, 246, 0.35)',
        'spark-lg':    '0 0 40px rgba(187, 92, 246, 0.45)',
        'spark-soft':  '0 0 12px rgba(187, 92, 246, 0.25)',
        'pulse':       '0 0 16px rgba(16, 137, 129, 0.4)',
        'inset-rim':   'inset 0 1px 0 rgba(255,255,255,0.06)',
      },

      // ─────────────────────────────────────────
      // Brand gradients (use as bg-image)
      // ─────────────────────────────────────────
      backgroundImage: {
        'spark-gradient':   'linear-gradient(135deg, #BB5CF6 0%, #7B2FFF 100%)',
        'chrome-gradient':  'linear-gradient(135deg, #FFFFFF 0%, #C8C8D8 50%, #8888AA 100%)',
        'rim-gradient':     'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))',
        'mesh-radial':      'radial-gradient(ellipse at top, rgba(187,92,246,0.15), transparent 60%)',
      },

      // ─────────────────────────────────────────
      // Motion
      // ─────────────────────────────────────────
      animation: {
        'fade-in':         'fadeIn 0.6s ease-out forwards',
        'float':           'float 6s ease-in-out infinite',
        'float-delayed':   'float 6s ease-in-out 2s infinite',
        'pulse-spark':     'pulseSpark 2s ease-in-out infinite',
        'shimmer':         'shimmer 3s linear infinite',
        'chat-bubble':     'chatBubble 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        pulseSpark: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(187,92,246,0.3)' },
          '50%':      { boxShadow: '0 0 24px rgba(187,92,246,0.6)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        chatBubble: {
          '0%':   { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },

      // Backwards-compat aliases (so existing classes keep working)
      backgroundColor: {
        'neural-silver':  '#E2E8F0',
      },
    },
  },
  plugins: [],
}

export default config
