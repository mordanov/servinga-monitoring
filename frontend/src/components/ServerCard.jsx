import React from 'react'
import { StatGauge } from './StatGauge'
import { MiniChart } from './MiniChart'
import { fmtBytesPerSec, fmtBytes, fmtUptime, fmtPct, colorForPct } from '../api/utils'
import { useStats } from '../hooks/useStats'

const css = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '20px',
    cursor: 'pointer',
    transition: 'border-color 200ms ease, transform 200ms ease',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHover: {
    borderColor: 'var(--border-hi)',
    transform: 'translateY(-2px)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dot: (online) => ({
    width: 8, height: 8, borderRadius: '50%',
    background: online ? 'var(--green)' : 'var(--red)',
    boxShadow: online ? '0 0 8px var(--green)' : 'none',
    marginTop: 4,
    flexShrink: 0,
  }),
  name: {
    fontFamily: 'var(--font-mono)',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--txt)',
    letterSpacing: '-0.02em',
  },
  instance: {
    fontSize: 11,
    color: 'var(--txt-dim)',
    fontFamily: 'var(--font-mono)',
    marginTop: 2,
  },
  gaugeRow: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    margin: '0 0 14px',
  },
  netRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 16,
  },
  netBox: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '8px 10px',
  },
  netLabel: {
    fontSize: 10,
    color: 'var(--txt-dim)',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 2,
  },
  netValue: {
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
  },
  meta: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: 11,
    color: 'var(--txt-dim)',
    fontFamily: 'var(--font-mono)',
  },
}

export function ServerCard({ server, onClick, selected }) {
  const [hovered, setHovered] = React.useState(false)
  const { data: statsData } = useStats(server.instance, '1h', 30000)

  const latest = server.latest || {}
  const series = statsData?.series || []

  const borderColor = selected
    ? 'var(--green)'
    : hovered ? 'var(--border-hi)' : 'var(--border)'

  return (
    <div
      style={{ ...css.card, borderColor }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: server.online
          ? 'linear-gradient(90deg, var(--green), transparent)'
          : 'var(--red)',
      }} />

      {/* Header */}
      <div style={css.header}>
        <div>
          <div style={css.name}>{server.server_name}</div>
          <div style={css.instance}>{server.instance}</div>
        </div>
        <div style={css.dot(server.online)} />
      </div>

      {/* Gauges */}
      <div style={css.gaugeRow}>
        <StatGauge label="CPU" value={latest.cpu_usage_pct} size={72} />
        <StatGauge label="MEM" value={latest.mem_used_pct} size={72} />
      </div>

      {/* Sparklines */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>CPU (1h)</div>
        <MiniChart
          data={series}
          dataKey="cpu_usage_pct"
          color={colorForPct(latest.cpu_usage_pct)}
          height={36}
          formatter={v => `${v?.toFixed(1)}%`}
        />
      </div>

      <div style={css.divider} />

      {/* Network */}
      <div style={css.netRow}>
        <div style={css.netBox}>
          <div style={css.netLabel}>↓ RX</div>
          <div style={{ ...css.netValue, color: 'var(--blue)' }}>
            {fmtBytesPerSec(latest.net_rx_bytes_sec)}
          </div>
        </div>
        <div style={css.netBox}>
          <div style={css.netLabel}>↑ TX</div>
          <div style={{ ...css.netValue, color: 'var(--purple)' }}>
            {fmtBytesPerSec(latest.net_tx_bytes_sec)}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={css.meta}>
        <span style={css.metaItem}>up {fmtUptime(latest.uptime_seconds)}</span>
        {latest.load1 != null && (
          <span style={css.metaItem}>load {latest.load1?.toFixed(2)}</span>
        )}
        {latest.mem_total_bytes != null && (
          <span style={css.metaItem}>ram {fmtBytes(latest.mem_total_bytes)}</span>
        )}
      </div>
    </div>
  )
}
