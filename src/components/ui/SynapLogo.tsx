'use client'

interface SynapLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  showTagline?: boolean
  variant?: 'default' | 'icon-only' | 'stacked'
  className?: string
}

export default function SynapLogo({
  size = 'md',
  showText = true,
  showTagline = false,
  variant = 'default',
  className = '',
}: SynapLogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-base', letterSpacing: '0.25em' },
    md: { icon: 44, text: 'text-xl', letterSpacing: '0.28em' },
    lg: { icon: 64, text: 'text-3xl', letterSpacing: '0.3em' },
    xl: { icon: 96, text: 'text-5xl', letterSpacing: '0.32em' },
  }

  const s = sizes[size]
  const id = `synap-${Math.random().toString(36).substr(2, 6)}`

  const Mark = () => (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        {/* Chrome/silver ribbon gradient */}
        <linearGradient id={`chrome-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="25%" stopColor="#C8C8D8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#8888AA" stopOpacity="0.8" />
          <stop offset="75%" stopColor="#D0D0E8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
        </linearGradient>

        {/* Second ribbon gradient (slightly offset) */}
        <linearGradient id={`chrome2-${id}`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="30%" stopColor="#B8B8CC" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#9090B0" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#E8E8F8" stopOpacity="0.9" />
        </linearGradient>

        {/* Purple diamond glow */}
        <radialGradient id={`diamondGlow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#BB5CF6" stopOpacity="1" />
          <stop offset="40%" stopColor="#9B3CD6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7B2FFF" stopOpacity="0" />
        </radialGradient>

        {/* Outer purple aura */}
        <radialGradient id={`aura-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#BB5CF6" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#9B3CD6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#7B2FFF" stopOpacity="0" />
        </radialGradient>

        {/* Glow filter for the diamond */}
        <filter id={`diamondFilter-${id}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="2" result="blur2" in="SourceGraphic" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Soft glow for ribbons */}
        <filter id={`ribbonGlow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Outer purple aura behind everything ── */}
      <ellipse cx="50" cy="50" rx="22" ry="22" fill={`url(#aura-${id})`} />

      {/* ────────────────────────────────────────
          RIBBON 1 — curves from top-left to bottom-right
          (filled ribbon with thickness)
          ──────────────────────────────────────── */}
      {/* Ribbon 1 outer edge */}
      <path
        d="M 8 18 C 18 18, 28 22, 50 50 C 72 78, 82 82, 92 82"
        stroke={`url(#chrome-${id})`}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
        filter={`url(#ribbonGlow-${id})`}
      />
      {/* Ribbon 1 highlight (thin bright edge) */}
      <path
        d="M 8 18 C 18 18, 28 22, 50 50 C 72 78, 82 82, 92 82"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* ────────────────────────────────────────
          RIBBON 2 — curves from top-right to bottom-left
          ──────────────────────────────────────── */}
      {/* Ribbon 2 outer edge */}
      <path
        d="M 92 18 C 82 18, 72 22, 50 50 C 28 78, 18 82, 8 82"
        stroke={`url(#chrome2-${id})`}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
        filter={`url(#ribbonGlow-${id})`}
      />
      {/* Ribbon 2 highlight */}
      <path
        d="M 92 18 C 82 18, 72 22, 50 50 C 28 78, 18 82, 8 82"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Purple outer glow circle at center ── */}
      <circle cx="50" cy="50" r="16" fill={`url(#aura-${id})`} />

      {/* ── Lens flare lines (horizontal) ── */}
      <line x1="30" y1="50" x2="70" y2="50" stroke="#BB5CF6" strokeWidth="0.8" opacity="0.6" />
      <line x1="24" y1="50" x2="76" y2="50" stroke="#BB5CF6" strokeWidth="0.4" opacity="0.3" />

      {/* ── Diamond (4-pointed star) spark ── */}
      <g filter={`url(#diamondFilter-${id})`}>
        {/* Purple glow disc */}
        <circle cx="50" cy="50" r="10" fill="#BB5CF6" opacity="0.35" />
        {/* The diamond shape — 4-pointed star */}
        <path
          d="M 50 38 L 53.5 46.5 L 62 50 L 53.5 53.5 L 50 62 L 46.5 53.5 L 38 50 L 46.5 46.5 Z"
          fill="#BB5CF6"
        />
        {/* Bright center of diamond */}
        <path
          d="M 50 42 L 52.5 47.5 L 58 50 L 52.5 52.5 L 50 58 L 47.5 52.5 L 42 50 L 47.5 47.5 Z"
          fill="#D580FF"
        />
        {/* Specular highlight */}
        <ellipse cx="48" cy="47" rx="2" ry="1.5" fill="white" opacity="0.7" transform="rotate(-15 48 47)" />
      </g>
    </svg>
  )

  if (variant === 'icon-only') {
    return (
      <div className={className}>
        <Mark />
      </div>
    )
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <Mark />
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="font-heading font-black text-white tracking-[0.28em] text-sm"
            style={{ letterSpacing: s.letterSpacing }}
          >
            SYNAP
          </span>
          {showTagline && (
            <span className="font-heading text-[0.45em] tracking-widest text-neural-silver/70 uppercase">
              PERFORMANCE{' '}
              <span style={{ color: '#BB5CF6' }}>CONNECTED.</span>
            </span>
          )}
        </div>
      </div>
    )
  }

  // Default: horizontal layout
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Mark />
      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={`font-heading font-black text-white leading-none ${s.text}`}
            style={{ letterSpacing: s.letterSpacing }}
          >
            SYNAP
          </span>
          {showTagline && (
            <span
              className="font-heading font-medium text-neural-silver/60 tracking-widest uppercase leading-none mt-0.5"
              style={{ fontSize: '0.45em', letterSpacing: '0.18em' }}
            >
              PERFORMANCE{' '}
              <span style={{ color: '#BB5CF6' }}>CONNECTED.</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
