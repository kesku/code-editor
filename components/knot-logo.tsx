'use client'

import { useId } from 'react'

interface KnotLogoProps {
  size?: number
  className?: string
  color?: string
}

export function KnotLogo({ size = 24, className, color }: KnotLogoProps) {
  const id = useId()
  const c = color || 'currentColor'
  const sw = 5.5
  const maskId = `knot-mask-${id}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Knot Code"
      role="img"
    >
      <defs>
        <mask id={maskId}>
          <rect width="64" height="64" fill="white" />
          <line x1="19" y1="21" x2="45" y2="43" stroke="black" strokeWidth={sw + 6} strokeLinecap="round" />
        </mask>
      </defs>

      <g stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Loop A: top-left ↔ bottom-right (OVER at center crossing) */}
        <path d="M18 8 C7 8, 4 22, 15 27 C26 32, 32 22, 25 14 C18 6, 7 12, 18 22" />
        <path d="M46 56 C57 56, 60 42, 49 37 C38 32, 32 42, 39 50 C46 58, 57 52, 46 42" />
        <path d="M18 22 L46 42" />

        {/* Loop B: top-right ↔ bottom-left (UNDER — masked at crossing) */}
        <g mask={`url(#${maskId})`}>
          <path d="M46 8 C57 8, 60 22, 49 27 C38 32, 32 22, 39 14 C46 6, 57 12, 46 22" />
          <path d="M18 56 C7 56, 4 42, 15 37 C26 32, 32 42, 25 50 C18 58, 7 52, 18 42" />
          <path d="M46 22 L18 42" />
        </g>
      </g>
    </svg>
  )
}
