import { useState, useEffect, useCallback } from 'react'
import { fetchServers } from '../api/client'

export function useServers(intervalMs = 30000) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    try {
      const result = await fetchServers()
      setData(result)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message || 'Failed to fetch servers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, intervalMs)
    return () => clearInterval(id)
  }, [load, intervalMs])

  return { data, loading, error, lastRefresh, refresh: load }
}
