import React, { useState } from 'react'
import { useServers } from './hooks/useServers'
import { ServerCard } from './components/ServerCard'
import { DetailPanel } from './components/DetailPanel'

function Header({ lastRefresh, refresh, loading, count }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      padding: '14px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(11,13,17,0.85)',
      backdropFilter: 'blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Logo mark */}
        <div style={{
          width: 32, height: 32,
          background: 'var(--green)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="6" height="6" rx="1" fill="#0b0d11"/>
            <rect x="10" y="2" width="6" height="6" rx="1" fill="#0b0d11" opacity="0.5"/>
            <rect x="2" y="10" width="6" height="6" rx="1" fill="#0b0d11" opacity="0.5"/>
            <rect x="10" y="10" width="6" height="6" rx="1" fill="#0b0d11"/>
          </svg>
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '-0.02em',
            color: 'var(--txt)',
          }}>
            SERVINGA
            <span style={{ color: 'var(--green)', marginLeft: 6 }}>MONITOR</span>
          </div>
          {count != null && (
            <div style={{ fontSize: 11, color: 'var(--txt-dim)', fontFamily: 'var(--font-mono)' }}>
              {count} server{count !== 1 ? 's' : ''} tracked
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {lastRefresh && (
          <span style={{ fontSize: 11, color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)' }}>
            updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            background: 'var(--bg-card2)',
            border: '1px solid var(--border-hi)',
            color: loading ? 'var(--txt-muted)' : 'var(--txt)',
            borderRadius: 5,
            padding: '6px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 150ms ease',
            letterSpacing: '0.05em',
          }}
        >
          {loading ? 'LOADING…' : '↺ REFRESH'}
        </button>
      </div>
    </header>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 400, gap: 16, padding: 40,
    }}>
      <div style={{
        width: 64, height: 64,
        border: '2px solid var(--border-hi)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28,
      }}>⚠</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--txt-dim)' }}>
        No servers found
      </div>
      <div style={{ fontSize: 13, color: 'var(--txt-muted)', textAlign: 'center', maxWidth: 440, lineHeight: 1.7 }}>
        Make sure <code style={{ background: 'var(--bg-card2)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 12 }}>node_exporter</code> is running on your VPS servers
        and that your <code style={{ background: 'var(--bg-card2)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 12 }}>prometheus/prometheus.yml</code> has their IPs configured.
      </div>
    </div>
  )
}

export default function App() {
  const { data, loading, error, lastRefresh, refresh } = useServers(30000)
  const [selected, setSelected] = useState(null)

  const servers = data?.servers || []

  const handleSelect = (server) => {
    setSelected(prev => prev?.instance === server.instance ? null : server)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header
        lastRefresh={lastRefresh}
        refresh={refresh}
        loading={loading}
        count={servers.length}
      />

      <main style={{ padding: '28px 28px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(255,77,109,0.08)',
            border: '1px solid rgba(255,77,109,0.3)',
            borderRadius: 6,
            padding: '10px 16px',
            marginBottom: 20,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--red)',
          }}>
            ⚠ API error: {error} — Is the backend running?
          </div>
        )}

        {/* Server cards grid */}
        {!loading && servers.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: selected ? 24 : 0,
          }}>
            {loading && servers.length === 0
              ? [1, 2, 3].map(i => (
                  <div key={i} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    height: 280,
                    animation: 'pulse 1.5s ease infinite',
                  }} />
                ))
              : servers.map(server => (
                  <ServerCard
                    key={server.instance}
                    server={server}
                    onClick={() => handleSelect(server)}
                    selected={selected?.instance === server.instance}
                  />
                ))
            }
          </div>
        )}

        {/* Detail panel */}
        {selected && (
          <div style={{ marginTop: 8 }}>
            <DetailPanel
              server={selected}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
