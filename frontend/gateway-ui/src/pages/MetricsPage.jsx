import { useEffect, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Grid, CircularProgress,
  IconButton, ToggleButtonGroup, ToggleButton, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getMetrics } from '../utils/api'
import toast from 'react-hot-toast'

const COLORS = ['#1a73e8','#34a853','#ea4335','#fbbc04','#9c27b0','#00acc1','#ff7043','#66bb6a']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: 'white', border: '1px solid #e0e0e0', borderRadius: 1, p: 1.5 }}>
      <Typography variant="caption" fontFamily="monospace" display="block" sx={{ mb: 0.5 }}>{label}</Typography>
      {payload.map((p) => (
        <Typography key={p.dataKey} variant="caption" display="block" sx={{ color: p.color }}>
          {p.name}: {p.value}
        </Typography>
      ))}
    </Box>
  )
}

export default function MetricsPage() {
  const [raw, setRaw] = useState({})
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('requests')
  const [autoRefresh, setAutoRefresh] = useState(false)

  async function load() {
    setLoading(true)
    try { const { data } = await getMetrics(); setRaw(data) }
    catch (_) { toast.error('Failed to load metrics') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(load, 30_000); return () => clearInterval(t)
  }, [autoRefresh])

  const routes = Object.keys(raw)

  function buildTimeline(field) {
    const map = {}
    routes.forEach((route) => {
      ;(raw[route] || []).forEach((row) => {
        if (!map[row.minute]) map[row.minute] = { minute: row.minute }
        map[row.minute][route] = row[field]
      })
    })
    return Object.values(map).sort((a, b) => a.minute.localeCompare(b.minute))
  }

  const timeline = tab === 'requests' ? buildTimeline('requests')
    : tab === 'latency' ? buildTimeline('avg_latency_ms')
    : buildTimeline('errors')

  const totals = routes.reduce((acc, route) => {
    const rows = raw[route] || []
    acc.requests += rows.reduce((s, r) => s + r.requests, 0)
    acc.errors   += rows.reduce((s, r) => s + r.errors, 0)
    const active = rows.filter((r) => r.requests > 0)
    if (active.length) { acc.latencySum += active.reduce((s, r) => s + r.avg_latency_ms, 0); acc.latencyCnt++ }
    return acc
  }, { requests: 0, errors: 0, latencySum: 0, latencyCnt: 0 })

  const avgLatency = totals.latencyCnt ? Math.round(totals.latencySum / totals.latencyCnt) : 0

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5">Metrics</Typography>
          <Typography variant="body2" color="text.secondary">Per-route traffic — last 60 minutes</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ToggleButtonGroup size="small" value={autoRefresh ? 'on' : 'off'} exclusive
            onChange={(_, v) => setAutoRefresh(v === 'on')}>
            <ToggleButton value="off">Manual</ToggleButton>
            <ToggleButton value="on">Auto 30s</ToggleButton>
          </ToggleButtonGroup>
          <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
        </Box>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Requests', value: totals.requests.toLocaleString(), color: '#1a73e8' },
          { label: 'Total Errors',   value: totals.errors.toLocaleString(),   color: totals.errors > 0 ? '#ea4335' : '#34a853' },
          { label: 'Avg Latency',    value: `${avgLatency}ms`,               color: '#fbbc04' },
          { label: 'Routes',         value: routes.length,                    color: '#9c27b0' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h5" fontWeight={600} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600}>Traffic</Typography>
            <ToggleButtonGroup size="small" value={tab} exclusive onChange={(_, v) => v && setTab(v)}>
              <ToggleButton value="requests">Requests/min</ToggleButton>
              <ToggleButton value="latency">Avg Latency</ToggleButton>
              <ToggleButton value="errors">Errors/min</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {loading && routes.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : routes.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={6}>No metrics data</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="minute" tick={{ fontSize: 11, fontFamily: 'monospace' }} interval="preserveStartEnd" tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {routes.map((route, i) => (
                  <Line key={route} type="monotone" dataKey={route} name={route}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-route table */}
      {routes.length > 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Route Summary</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    {['Route', 'Requests', 'Errors', 'Error Rate', 'Avg Latency'].map((h) => (
                      <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route, i) => {
                    const rows = raw[route] || []
                    const reqs = rows.reduce((s, r) => s + r.requests, 0)
                    const errs = rows.reduce((s, r) => s + r.errors, 0)
                    const active = rows.filter((r) => r.requests > 0)
                    const lat = active.length ? Math.round(active.reduce((s, r) => s + r.avg_latency_ms, 0) / active.length) : 0
                    const errRate = reqs > 0 ? ((errs / reqs) * 100).toFixed(1) : '0.0'
                    return (
                      <tr key={route} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                            <Typography fontFamily="monospace" fontSize={13}>{route}</Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '12px 16px' }}><Typography fontSize={13}>{reqs.toLocaleString()}</Typography></td>
                        <td style={{ padding: '12px 16px' }}><Typography fontSize={13} color={errs > 0 ? 'error.main' : 'text.secondary'}>{errs}</Typography></td>
                        <td style={{ padding: '12px 16px' }}><Typography fontSize={13} color={parseFloat(errRate) > 5 ? 'error.main' : 'success.main'}>{errRate}%</Typography></td>
                        <td style={{ padding: '12px 16px' }}><Typography fontSize={13} color={lat > 500 ? 'warning.main' : 'text.secondary'}>{lat > 0 ? `${lat}ms` : '—'}</Typography></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
