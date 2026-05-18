import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const fetchServers = () =>
  api.get('/servers').then(r => r.data)

export const fetchStats = (instance, period = '1h') =>
  api.get(`/stats/${encodeURIComponent(instance)}`, { params: { period } }).then(r => r.data)

export const fetchHealth = () =>
  api.get('/health').then(r => r.data)
