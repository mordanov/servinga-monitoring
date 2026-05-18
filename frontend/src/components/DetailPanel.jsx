import React, { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useStats } from '../hooks/useStats'
import { fmtBytesPerSec, fmtBytes, fmtPct, fmtTime, colorForPct, fmtUptime } from '../api/utils'
import { StatGauge } from './StatGauge'

const PERIODS = ['1h', '6h', '24h', '7d']

const CustomTooltip = ({ active, payload, label, valueFormatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card2)',
      border: '1px solid var(--border-hi)',
      borderRadius: 6,
      padding: '8px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
    }}>
      <div style={{ color: 'var(--txt-dim)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, lineHeight: 1.6 }}>
          {p.name}: {valueFormatter ? valueFormatter(p.value) : p.value?.toFixed(2)}
        </div>
      ))}
    </div>
  )
}

function ChartBlock({ title, data, series, height = 140 }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '14px 16px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--txt-dim)',
        marginBottom: 10,
      }}>{title}</div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map(s => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="ts"
            tick={{ fill: 'var(--txt-dim)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'var(--txt-dim)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={series[0]?.yFmt}
            width={48}
          />
          <Tooltip content={<CustomTooltip valueFormatter={series[0]?.tooltipFmt} />} />
          {series.length > 1 && <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: 11 }} />}
          {series.map(s => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name || s.key}
              stroke={s.color}
              strokeWidth={1.5}
              fill={`url(#g-${s.key})`}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--txt-dim)', fontFamily: 'var(--font-mono)' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: color || 'var(--txt)' }}>{value}</span>
    </div>
  )
}

export function DetailPanel({ server, onClose }) {
  const [period, setPeriod] = useState('1h')
  const { data, loading } = useStats(server.instance, period, 30000)

  const latest = server.latest || {}

  // Prepare chart data
  const series = (data?.series || []).map(pt => {
    const d = new Date(pt.timestamp)
    return {
      ...pt,
      ts: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  })

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-hi)',
      borderRadius: 10,
      padding: 24,
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--txt)',
            letterSpacing: '-0.03em',
          }}>
            {server.server_name}
            <span style={{
              display: 'inline-block',
              width: 8, height: 8,
              background: server.online ? 'var(--green)' : 'var(--red)',
              borderRadius: '50%',
              marginLeft: 10,
              boxShadow: server.online ? '0 0 8px var(--green)' : 'none',
              verticalAlign: 'middle',
            }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {server.instance}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  background: period === p ? 'var(--green)' : 'var(--bg-card2)',
                  border: `1px solid ${period === p ? 'var(--green)' : 'var(--border)'}`,
                  color: period === p ? 'var(--bg)' : 'var(--txt-dim)',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: period === p ? 700 : 400,
                  transition: 'all 150ms ease',
                }}
              >{p}</button>
            ))}
          </div>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-card2)',
              border: '1px solid var(--border)',
              color: 'var(--txt-dim)',
              borderRadius: 4,
              width: 30, height: 30,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      </div>

      {/* Gauges + stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12,
        marginBottom: 20,
      }}>
        {/* Gauges */}
        <div style={{
          background: 'var(--bg-card2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '16px',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          gridColumn: 'span 1',
        }}>
          <StatGauge label="CPU" value={latest.cpu_usage_pct} size={80} />
          <StatGauge label="MEM" value={latest.mem_used_pct} size={80} />
        </div>

        {/* Network stats */}
        <div style={{
          background: 'var(--bg-card2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 10, color: 'var(--txt-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Network</div>
          <StatRow label="↓ RX" value={fmtBytesPerSec(latest.net_rx_bytes_sec)} color="var(--blue)" />
          <StatRow label="↑ TX" value={fmtBytesPerSec(latest.net_tx_bytes_sec)} color="var(--purple)" />
        </div>

        {/* System info */}
        <div style={{
          background: 'var(--bg-card2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 10, color: 'var(--txt-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>System</div>
          <StatRow label="Uptime"   value={fmtUptime(latest.uptime_seconds)} />
          <StatRow label="Load 1m"  value={latest.load1?.toFixed(2) ?? '—'} />
          <StatRow label="Load 5m"  value={latest.load5?.toFixed(2) ?? '—'} />
          <StatRow label="RAM Total" value={fmtBytes(latest.mem_total_bytes)} />
        </div>
      </div>

      {/* Charts grid */}
      {loading && !series.length ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Loading chart data…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ChartBlock
            title="CPU Utilization (%)"
            data={series}
            series={[{ key: 'cpu_usage_pct', name: 'CPU %', color: 'var(--green)', yFmt: v => `${v?.toFixed(0)}%`, tooltipFmt: v => `${v?.toFixed(1)}%` }]}
          />
          <ChartBlock
            title="Memory Usage (%)"
            data={series}
            series={[{ key: 'mem_used_pct', name: 'MEM %', color: 'var(--amber)', yFmt: v => `${v?.toFixed(0)}%`, tooltipFmt: v => `${v?.toFixed(1)}%` }]}
          />
          <ChartBlock
            title="Network I/O (bytes/s)"
            data={series}
            series={[
              { key: 'net_rx_bytes_sec', name: 'RX', color: 'var(--blue)', yFmt: v => fmtBytes(v), tooltipFmt: v => fmtBytesPerSec(v) },
              { key: 'net_tx_bytes_sec', name: 'TX', color: 'var(--purple)', yFmt: v => fmtBytes(v), tooltipFmt: v => fmtBytesPerSec(v) },
            ]}
          />
          <ChartBlock
            title="Disk I/O (bytes/s)"
            data={series}
            series={[
              { key: 'disk_read_bytes_sec', name: 'Read', color: 'var(--green)', yFmt: v => fmtBytes(v), tooltipFmt: v => fmtBytesPerSec(v) },
              { key: 'disk_write_bytes_sec', name: 'Write', color: 'var(--red)', yFmt: v => fmtBytes(v), tooltipFmt: v => fmtBytesPerSec(v) },
            ]}
          />
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 14, fontSize: 11, color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
        {data?.points ?? 0} data points · refreshes every 30s
      </div>
    </div>
  )
}
