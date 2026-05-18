import { useState, useEffect, useCallback } from 'react'
import { fetchStats } from '../api/client'

export function useStats(instance, period = '1h', intervalMs = 30000) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!instance) return
    try {
      const result = await fetchStats(instance, period)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch stats')
    } finally {
      setLoading(false)
    }
  }, [instance, period])

  useEffect(() => {
    setLoading(true)
    setData(null)
    load()
    const id = setInterval(load, intervalMs)
    return () => clearInterval(id)
  }, [load, intervalMs])

  return { data, loading, error, refresh: load }
}
