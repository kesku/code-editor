'use client'

import { useId, useMemo } from 'react'

const cx = 50
const cy = 50
const R = 50
const loopR = 22
const ANGLES = [0, 60, 120, 180, 240, 300]

function petalPath(deg: number): string {
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
}

const PETAL_PATHS = ANGLES.map(petalPath)

const FLOATERS = [
  { size: 340, x: '-6%', y: '-10%', delay: '0s', dur: '50s' },
  { size: 280, x: '72%', y: '55%', delay: '-20s', dur: '58s' },
  { size: 220, x: '35%', y: '82%', delay: '-35s', dur: '44s' },
] as const

function KnotPaths({ strokeWidth = 1.6, opacity = 1 }: { strokeWidth?: number; opacity?: number }) {
  return (
    <g
      style={{ stroke: 'var(--brand)' }}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={opacity}
    >
      {PETAL_PATHS.map((d, i) => (
        <path key={i} d={d} opacity={i % 2 === 0 ? 1 : 0.65} />
      ))}
    </g>
  )
}

export function KnotBackground() {
  const uid = useId()
  const pid = useMemo(() => uid.replace(/:/g, ''), [uid])

  return (
    <div className="knot-bg-root" aria-hidden="true">
      {/* Layer 1: tiled knot pattern */}
      <svg
        className="knot-bg-pattern"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id={`kp${pid}`} width="120" height="120" patternUnits="userSpaceOnUse">
            <g transform="translate(10,10) scale(1)">
              <KnotPaths strokeWidth={1.5} />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#kp${pid})`} />
      </svg>

      {/* Layer 2: floating blurred knot silhouettes */}
      {FLOATERS.map((f, i) => (
        <div
          key={i}
          className="knot-bg-float"
          style={{
            width: f.size,
            height: f.size,
            left: f.x,
            top: f.y,
            animationDelay: f.delay,
            animationDuration: f.dur,
          }}
        >
          <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%">
            <g
              style={{ stroke: 'var(--mode-accent, var(--brand))' }}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              {PETAL_PATHS.map((d, j) => (
                <path key={j} d={d} opacity={j % 2 === 0 ? 1 : 0.7} />
              ))}
            </g>
          </svg>
        </div>
      ))}

      {/* Layer 3: mode-accent glow */}
      <div className="knot-bg-glow" />
    </div>
  )
}
