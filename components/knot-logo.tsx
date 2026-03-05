'use client'

import { useId } from 'react'

interface KnotLogoProps {
  size?: number
  className?: string
  color?: string
}

/**
 * Celtic-style interwoven knot with 6 radiating loops.
 * Inspired by the OpenKnots brand mark — each loop weaves
 * over-and-under its neighbours via stroke masks.
 */
export function KnotLogo({ size = 24, className, color }: KnotLogoProps) {
  const uid = useId()
  const c = color || 'currentColor'
  const id = uid.replace(/:/g, '')

  const R = 50
  const cx = 50
  const cy = 50
  const loopR = 22
  const sw = 5.8

  const angles = [0, 60, 120, 180, 240, 300]

  const petalPaths = angles.map((deg) => {
    const rad = (deg * Math.PI) / 180
    const px = cx + R * 0.42 * Math.cos(rad)
    const py = cy + R * 0.42 * Math.sin(rad)

    const tangent = rad + Math.PI / 2
    const cp1x = px + loopR * 1.1 * Math.cos(tangent)
    const cp1y = py + loopR * 1.1 * Math.sin(tangent)
    const cp2x = px - loopR * 1.1 * Math.cos(tangent)
    const cp2y = py - loopR * 1.1 * Math.sin(tangent)

    const tipDist = loopR * 1.55
    const tipX = cx + (R * 0.42 + tipDist) * Math.cos(rad)
    const tipY = cy + (R * 0.42 + tipDist) * Math.sin(rad)

    const inTan1 = rad + 0.65
    const inTan2 = rad - 0.65
    const cpInnerR = loopR * 1.4

    return `M ${cx.toFixed(1)} ${cy.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${(tipX + cpInnerR * Math.cos(inTan1)).toFixed(1)} ${(tipY + cpInnerR * Math.sin(inTan1)).toFixed(1)}, ${tipX.toFixed(1)} ${tipY.toFixed(1)} C ${(tipX + cpInnerR * Math.cos(inTan2)).toFixed(1)} ${(tipY + cpInnerR * Math.sin(inTan2)).toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${cx.toFixed(1)} ${cy.toFixed(1)}`
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="KnotCode"
      role="img"
    >
      <defs>
        {petalPaths.map((_, i) => {
          const nextIdx = (i + 1) % 6
          const nextDeg = angles[nextIdx]
          const nextRad = (nextDeg * Math.PI) / 180
          const mskX = cx + R * 0.32 * Math.cos(nextRad)
          const mskY = cy + R * 0.32 * Math.sin(nextRad)
          return (
            <mask key={`m${i}`} id={`${id}m${i}`}>
              <rect width="100" height="100" fill="white" />
              <circle cx={mskX} cy={mskY} r={sw + 3} fill="black" />
            </mask>
          )
        })}
      </defs>

      {petalPaths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          mask={`url(#${id}m${i})`}
          opacity={i % 2 === 0 ? 1 : 0.7}
        />
      ))}
    </svg>
  )
}
