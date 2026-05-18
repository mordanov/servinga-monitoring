export function fmtBytes(bytes, decimals = 1) {
  if (bytes == null || isNaN(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function fmtBytesPerSec(bps, decimals = 1) {
  if (bps == null || isNaN(bps)) return '—'
  return fmtBytes(bps, decimals) + '/s'
}

export function fmtPct(val, decimals = 1) {
  if (val == null || isNaN(val)) return '—'
  return `${val.toFixed(decimals)}%`
}

export function fmtUptime(seconds) {
  if (seconds == null) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function colorForPct(pct) {
  if (pct == null) return 'var(--txt-dim)'
  if (pct >= 90) return 'var(--red)'
  if (pct >= 70) return 'var(--amber)'
  return 'var(--green)'
}

export function fmtTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
