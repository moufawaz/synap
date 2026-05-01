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
        obsidian: '#121212',          // SYNAP OBSIDIAN — depth, power, premium
        'obsidian-card': '#1A1A1A',   // Slightly lighter for cards
        'obsidian-border': '#242424', // Subtle card borders

        ion: {
          DEFAULT: '#BB5CF6',         // ELECTRIC ION — AI, innovation, energy
          dark: '#9B3CD6',
          light: '#CC80FF',
          glow: 'rgba(187,92,246,0.35)',
          faint: 'rgba(187,92,246,0.08)',
        },

        silver: {
          DEFAULT: '#E2E8F0',         // NEURAL SILVER — clarity, precision, technology
          muted: '#94A3B8',
          dark: '#64748B',
          faint: 'rgba(226,232,240,0.07)',
        },

        signal: {
          DEFAULT: '#108981',         // SIGNAL GREEN — success, progress, achievement
          light: '#14B8A0',
          dark: '#0D7066',
          glow: 'rgba(16,137,129,0.3)',
        },

        // Legacy aliases kept for backward compatibility
        charcoal: '#121212',
        'charcoal-light': '#1A1A1A',
        'charcoal-card': '#1A1A1A',
        violet: {
          DEFAULT: '#BB5CF6',
          dark: '#9B3CD6',
          light: '#CC80FF',
          glow: 'rgba(187,92,246,0.35)',
        },
        cyan: {
          DEFAULT: '#108981',
          dark: '#0D7066',
          glow: 'rgba(16,137,129,0.3)',
        },
        light: '#E2E8F0',
        'light-muted': '#94A3B8',
        'neural-silver': '#E2E8F0',
      },

      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-exo2)', 'Exo 2', 'system-ui', 'sans-serif'],
        display: ['var(--font-exo2)', 'Exo 2', 'system-ui', 'sans-serif'],
      },

      letterSpacing: {
        'synap': '0.25em',
        'widest-xl': '0.35em',
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-hero': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(187,92,246,0.2) 0%, transparent 70%)',
        'gradient-glow-ion': 'radial-gradient(circle at center, rgba(187,92,246,0.4) 0%, transparent 70%)',
        'gradient-glow-signal': 'radial-gradient(circle at center, rgba(16,137,129,0.3) 0%, transparent 70%)',
        'card-border': 'linear-gradient(135deg, rgba(187,92,246,0.3), rgba(226,232,240,0.08))',
        'ribbon-chrome': 'linear-gradient(135deg, #FFFFFF 0%, #C8C8D8 25%, #888899 50%, #D0D0E8 75%, #FFFFFF 100%)',
      },

      boxShadow: {
        'glow-ion': '0 0 30px rgba(187,92,246,0.45), 0 0 60px rgba(187,92,246,0.15)',
        'glow-ion-sm': '0 0 16px rgba(187,92,246,0.35)',
        'glow-signal': '0 0 30px rgba(16,137,129,0.35), 0 0 60px rgba(16,137,129,0.1)',
        'glow-silver': '0 0 20px rgba(226,232,240,0.15)',
        'card': '0 4px 24px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset',
        'card-hover': '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(187,92,246,0.2)',
        // kept for compat
        'glow-violet': '0 0 30px rgba(187,92,246,0.45), 0 0 60px rgba(187,92,246,0.15)',
        'glow-sm': '0 0 16px rgba(187,92,246,0.35)',
        'glow-cyan': '0 0 30px rgba(16,137,129,0.35)',
      },

      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'pulse-glow-slow': 'pulseGlow 5s ease-in-out infinite',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'spark': 'spark 2s ease-in-out infinite',
        'diamond-pulse': 'diamondPulse 2.5s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(187,92,246,0.3)' },
          '50%': { boxShadow: '0 0 50px rgba(187,92,246,0.7), 0 0 100px rgba(187,92,246,0.2)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        spark: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.3)' },
        },
        diamondPulse: {
          '0%, 100%': { opacity: '0.85', filter: 'brightness(1)' },
          '50%': { opacity: '1', filter: 'brightness(1.4)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
