import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, Chip, Grid, CircularProgress, Divider, IconButton, LinearProgress } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import RefreshIcon from '@mui/icons-material/Refresh'
import RouterIcon from '@mui/icons-material/Router'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import StorageIcon from '@mui/icons-material/Storage'
import SpeedIcon from '@mui/icons-material/Speed'
import { getPlatformHealth } from '../utils/api'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  HEALTHY:  { color: 'success', icon: <CheckCircleIcon />, label: 'Healthy'  },
  DEGRADED: { color: 'warning', icon: <WarningIcon />,     label: 'Degraded' },
  DOWN:     { color: 'error',   icon: <ErrorIcon />,       label: 'Down'     },
}

export default function HomePage() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { const { data } = await getPlatformHealth(); setHealth(data) }
    catch (_) { toast.error('Failed to load platform health') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>

  const cfg = STATUS_CONFIG[health?.overall_status] || STATUS_CONFIG.DOWN
  const upPct = health ? Math.round((health.services_up / health.services_total) * 100) : 0

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Platform Overview</Typography>
          <Typography variant="body2" color="text.secondary">
            Live health across all gateway services
          </Typography>
        </Box>
        <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
      </Box>

      {/* Overall status banner */}
      <Card sx={{ mb: 3, border: `1px solid`, borderColor: `${cfg.color}.main` }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
          <Chip label={cfg.label} color={cfg.color} icon={cfg.icon} size="medium" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {health?.services_up}/{health?.services_total} services healthy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Checked in {health?.checked_in_ms}ms — {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : ''}
            </Typography>
          </Box>
          <Box sx={{ width: 120 }}>
            <LinearProgress variant="determinate" value={upPct}
              color={health?.overall_status === 'HEALTHY' ? 'success' : health?.overall_status === 'DEGRADED' ? 'warning' : 'error'}
              sx={{ height: 8, borderRadius: 4 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
              {upPct}% up
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Gateway info cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { icon: <RouterIcon />, label: 'Routes Loaded',  value: health?.routes_loaded,                      color: '#1a73e8' },
          { icon: <VpnKeyIcon />, label: 'JWT Key',        value: health?.jwt_key_loaded ? 'Loaded' : 'Missing', color: health?.jwt_key_loaded ? '#34a853' : '#ea4335' },
          { icon: <StorageIcon />, label: 'Redis',         value: health?.redis || '—',                        color: health?.redis === 'ok' ? '#34a853' : '#ea4335' },
          { icon: <SpeedIcon />,  label: 'Response Time',  value: `${health?.checked_in_ms || 0}ms`,           color: '#fbbc04' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600} color={s.color}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Per-service table */}
      {health?.services?.length > 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Service Health</Typography>
            <Divider sx={{ mb: 2 }} />
            {health.services.map((svc, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: i < health.services.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                {svc.status === 'healthy'
                  ? <CheckCircleIcon sx={{ color: '#34a853', fontSize: 20 }} />
                  : <ErrorIcon sx={{ color: '#ea4335', fontSize: 20 }} />}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500} fontFamily="monospace">{svc.path_prefix}</Typography>
                  <Typography variant="caption" color="text.secondary">{svc.name}</Typography>
                </Box>
                <Chip label={svc.status} size="small" color={svc.status === 'healthy' ? 'success' : 'error'} />
                {svc.http_status && <Chip label={`HTTP ${svc.http_status}`} size="small" variant="outlined" />}
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: 'right' }}>
                  {svc.latency_ms}ms
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
