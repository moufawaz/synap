'use client'

import Image from 'next/image'

interface IonAvatarProps {
  gender?: 'male' | 'female'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  showStatus?: boolean
  className?: string
}

export default function IonAvatar({
  size = 'md',
  animated = false,
  showStatus = true,
  className = '',
}: IonAvatarProps) {
  const sizes = {
    sm: { wrap: 'w-8 h-8',   px: 32,  status: 'w-2 h-2',     statusBorder: 1.5 },
    md: { wrap: 'w-12 h-12', px: 48,  status: 'w-2.5 h-2.5', statusBorder: 2 },
    lg: { wrap: 'w-16 h-16', px: 64,  status: 'w-3 h-3',     statusBorder: 2 },
    xl: { wrap: 'w-24 h-24', px: 96,  status: 'w-3.5 h-3.5', statusBorder: 2.5 },
  }

  const s = sizes[size]

  return (
    <div
      className={`
        ${s.wrap} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden
        ${animated ? 'animate-pulse-spark' : ''}
        ${className}
      `}
      style={{
        border: '1px solid rgba(187, 92, 246, 0.40)',
        boxShadow: '0 0 16px rgba(187, 92, 246, 0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
        background: '#050510',
      }}
    >
      {/* Ambient violet aura behind image */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(187,92,246,0.15) 0%, transparent 70%)' }}
      />

      {/* ION avatar image */}
      <Image
        src="/ion-avatar.png"
        alt="ION"
        width={s.px}
        height={s.px}
        className="relative z-10 w-full h-full object-cover object-top"
        priority={size === 'xl'}
        draggable={false}
      />

      {/* Online / pulse status indicator */}
      {showStatus && (
        <div
          className={`absolute bottom-0 right-0 ${s.status} rounded-full z-20`}
          style={{
            background: '#108981',
            border: `${s.statusBorder}px solid #0E0E0E`,
            boxShadow: '0 0 6px rgba(16, 137, 129, 0.6)',
          }}
        >
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: '#108981', opacity: 0.5, animationDuration: '2.5s' }}
          />
        </div>
      )}
    </div>
  )
}
