import React from 'react'
import { colorForPct, fmtPct } from '../api/utils'

const SIZE = 80
const STROKE = 7
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R
// Arc goes from 225° to 135° (270° sweep) — bottom-left to bottom-right
const SWEEP = 0.75 * CIRC

export function StatGauge({ label, value, unit = '%', size = SIZE }) {
  const pct    = value != null ? Math.min(100, Math.max(0, value)) : 0
  const filled = (pct / 100) * SWEEP
  const color  = colorForPct(value)

  const scale  = size / SIZE
  const vb     = `0 0 ${SIZE} ${SIZE}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg
        width={size} height={size}
        viewBox={vb}
        style={{ transform: 'rotate(135deg)' }}
      >
        {/* Track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke="var(--border-hi)"
          strokeWidth={STROKE}
          strokeDasharray={`${SWEEP} ${CIRC}`}
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${filled} ${CIRC}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 600ms ease, stroke 400ms ease' }}
        />
      </svg>
      {/* Centre label (overlaid via negative margin trick) */}
      <div style={{
        marginTop: -size * 0.55,
        textAlign: 'center',
        pointerEvents: 'none',
        marginBottom: size * 0.12,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: size * 0.18,
          color,
          fontWeight: 700,
          lineHeight: 1,
          transition: 'color 400ms ease',
        }}>
          {value != null ? value.toFixed(1) : '—'}
        </div>
        <div style={{ fontSize: size * 0.13, color: 'var(--txt-dim)', lineHeight: 1.2 }}>{unit}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--txt-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}
