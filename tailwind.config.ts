import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── SYNAP Brand Colors ──────────────────────
        obsidian: {
          DEFAULT: '#0D0D1A',
          card: '#121220',
          border: '#1E1E35',
          hover: '#181828',
        },

        ion: {
          DEFAULT: '#7C3AED',   // Electric Violet — primary
          bright: '#BB5CF6',    // logo "spark" / accent text
          dark: '#5B21B6',
          light: '#A78BFA',
          glow: 'rgba(124,58,237,0.4)',
          faint: 'rgba(124,58,237,0.08)',
        },

        cyan: {
          DEFAULT: '#22D3EE',
          dark: '#0891B2',
          glow: 'rgba(34,211,238,0.3)',
          faint: 'rgba(34,211,238,0.08)',
        },

        silver: {
          DEFAULT: '#F0F0FF',
          muted: '#94A3B8',
          dark: '#64748B',
          faint: 'rgba(240,240,255,0.07)',
        },

        signal: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
          glow: 'rgba(16,185,129,0.3)',
        },

        alert: { DEFAULT: '#F59E0B', dark: '#D97706' },
        danger: { DEFAULT: '#EF4444', dark: '#DC2626' },

        // Legacy aliases (kept for backward compatibility)
        charcoal: '#0D0D1A',
        'charcoal-light': '#121220',
        violet: { DEFAULT: '#7C3AED', dark: '#5B21B6', light: '#A78BFA' },
        light: '#F0F0FF',
        'light-muted': '#94A3B8',
        'neural-silver': '#F0F0FF',
        'electric-violet': '#7C3AED',
      },

      fontFamily: {
        // ── SYNAP Typography (per brand spec) ────────
        // Body: Inter — clean, readable
        // Display + Heading: Exo 2 — wide-set with letter cuts ("digital and fast")
        // Mono: JetBrains Mono — tabular numerics, data
        sans:    ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-exo)', 'Exo 2', 'system-ui', 'sans-serif'],
        display: ['var(--font-exo)', 'Exo 2', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      letterSpacing: {
        'synap': '0.28em',       // wordmark
        'widest-xl': '0.32em',   // hero eyebrows
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-hero': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.25) 0%, rgba(34,211,238,0.05) 50%, transparent 70%)',
        'gradient-glow-ion': 'radial-gradient(circle at center, rgba(124,58,237,0.4) 0%, transparent 70%)',
        'gradient-glow-cyan': 'radial-gradient(circle at center, rgba(34,211,238,0.3) 0%, transparent 70%)',
        'gradient-glow-signal': 'radial-gradient(circle at center, rgba(16,185,129,0.3) 0%, transparent 70%)',
        'card-border': 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(34,211,238,0.1))',
        'gradient-ion': 'linear-gradient(135deg, #7C3AED 0%, #BB5CF6 100%)',
        'gradient-ion-cyan': 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
        'gradient-spark': 'radial-gradient(circle at center, #BB5CF6 0%, rgba(187,92,246,0.4) 35%, transparent 70%)',
      },

      boxShadow: {
        'glow-ion':     '0 0 30px rgba(124,58,237,0.45), 0 0 60px rgba(124,58,237,0.15)',
        'glow-ion-sm':  '0 0 16px rgba(124,58,237,0.35)',
        'glow-spark':   '0 0 12px #BB5CF6, 0 0 36px rgba(187,92,246,0.6)',
        'glow-cyan':    '0 0 30px rgba(34,211,238,0.35), 0 0 60px rgba(34,211,238,0.1)',
        'glow-cyan-sm': '0 0 16px rgba(34,211,238,0.3)',
        'glow-signal':  '0 0 30px rgba(16,185,129,0.35), 0 0 60px rgba(16,185,129,0.1)',
        'glow-silver':  '0 0 20px rgba(240,240,255,0.15)',
        'card':         '0 4px 24px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.04) inset',
        'card-hover':   '0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.2)',
        // compat
        'glow-violet':  '0 0 30px rgba(124,58,237,0.45)',
        'glow-sm':      '0 0 16px rgba(124,58,237,0.35)',
      },

      animation: {
        'float':           'float 6s ease-in-out infinite',
        'float-delayed':   'float 6s ease-in-out 2s infinite',
        'pulse-glow':      'pulseGlow 3s ease-in-out infinite',
        'pulse-glow-slow': 'pulseGlow 5s ease-in-out infinite',
        'slide-up':        'slideUp 0.6s ease-out forwards',
        'fade-in':         'fadeIn 0.8s ease-out forwards',
        'spark':           'spark 2s ease-in-out infinite',
        'diamond-pulse':   'diamondPulse 2.5s ease-in-out infinite',
        'scan-line':       'scanLine 3s linear infinite',
        'shimmer':         'shimmer 2s linear infinite',
      },

      keyframes: {
        float:        { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        pulseGlow:    { '0%, 100%': { boxShadow: '0 0 20px rgba(124,58,237,0.3)' }, '50%': { boxShadow: '0 0 50px rgba(124,58,237,0.7), 0 0 100px rgba(124,58,237,0.2)' } },
        slideUp:      { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        spark:        { '0%, 100%': { opacity: '0.6', transform: 'scale(1)' }, '50%': { opacity: '1', transform: 'scale(1.3)' } },
        diamondPulse: { '0%, 100%': { opacity: '0.85', filter: 'brightness(1)' }, '50%': { opacity: '1', filter: 'brightness(1.4)' } },
        scanLine:     { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}

export default config
