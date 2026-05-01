'use client'

interface IonAvatarProps {
  gender?: 'male' | 'female'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  className?: string
}

export default function IonAvatar({
  gender = 'male',
  size = 'md',
  animated = false,
  className = '',
}: IonAvatarProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }

  const innerSizes = {
    sm: 28,
    md: 42,
    lg: 56,
    xl: 84,
  }

  const s = innerSizes[size]
  const id = `ion-${gender}-${size}-${Math.random().toString(36).substr(2, 4)}`

  return (
    <div
      className={`
        ${sizes[size]} rounded-full flex items-center justify-center relative flex-shrink-0
        ${animated ? 'animate-pulse-glow' : ''}
        ${className}
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(187,92,246,0.2) 0%, rgba(187,92,246,0.05) 100%)',
        border: '1px solid rgba(187,92,246,0.3)',
      }}
    >
      {/* Glow ring */}
      <div
        className="absolute inset-0 rounded-full blur-sm"
        style={{ background: 'radial-gradient(circle, rgba(187,92,246,0.12) 0%, transparent 70%)' }}
      />

      {/* Avatar SVG */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id={`ionGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BB5CF6" />
            <stop offset="100%" stopColor="#9B3CD6" />
          </linearGradient>
          <radialGradient id={`ionFace-${id}`} cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#CC80FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#9B3CD6" stopOpacity="0.7" />
          </radialGradient>
        </defs>

        {/* Head */}
        <circle cx="24" cy="16" r="9" fill={`url(#ionFace-${id})`} />

        {/* Neck */}
        <rect x="20" y="24" width="8" height="4" rx="2" fill={`url(#ionGrad-${id})`} opacity="0.7" />

        {/* Shoulders */}
        {gender === 'male' ? (
          <path d="M 10 44 C 10 34 16 30 24 30 C 32 30 38 34 38 44" fill={`url(#ionGrad-${id})`} opacity="0.5" />
        ) : (
          <path d="M 12 44 C 12 35 17 30 24 30 C 31 30 36 35 36 44" fill={`url(#ionGrad-${id})`} opacity="0.5" />
        )}

        {/* Neural connection lines */}
        <line x1="24" y1="8" x2="17" y2="2" stroke="#BB5CF6" strokeWidth="0.8" opacity="0.5" />
        <line x1="24" y1="8" x2="31" y2="2" stroke="#BB5CF6" strokeWidth="0.8" opacity="0.5" />
        <circle cx="17" cy="2" r="1.2" fill="#BB5CF6" opacity="0.7" />
        <circle cx="31" cy="2" r="1.2" fill="#BB5CF6" opacity="0.7" />

        {/* Eyes */}
        <circle cx="21" cy="15" r="1.5" fill="white" opacity="0.9" />
        <circle cx="27" cy="15" r="1.5" fill="white" opacity="0.9" />
        <circle cx="21.5" cy="15" r="0.6" fill="#1A1A1A" />
        <circle cx="27.5" cy="15" r="0.6" fill="#1A1A1A" />

        {/* Subtle mouth */}
        <path d="M 21.5 19 Q 24 21 26.5 19" stroke="rgba(255,255,255,0.5)" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      </svg>

      {/* Online indicator */}
      <div
        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
        style={{ background: '#108981', borderColor: '#121212' }}
      />
    </div>
  )
}
