import React from 'react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

const CustomTooltip = ({ active, payload, formatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card2)',
      border: '1px solid var(--border-hi)',
      borderRadius: 4,
      padding: '4px 8px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--txt)',
    }}>
      {formatter ? formatter(payload[0].value) : payload[0].value?.toFixed(1)}
    </div>
  )
}

export function MiniChart({ data, dataKey, color = 'var(--green)', height = 40, formatter }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--txt-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>no data</span>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={['auto', 'auto']} hide />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${dataKey})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
