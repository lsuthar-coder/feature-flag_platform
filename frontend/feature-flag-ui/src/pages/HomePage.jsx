import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, Chip, Grid, CircularProgress, Divider, IconButton } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import FlagIcon from '@mui/icons-material/Flag'
import CategoryIcon from '@mui/icons-material/Category'
import RefreshIcon from '@mui/icons-material/Refresh'
import { getHealth, getFlags } from '../utils/api'

function StatCard({ icon, label, value, color }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}18` }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={600} color={color}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function HomePage() {
  const [health,  setHealth]  = useState(null)
  const [flags,   setFlags]   = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [{ data: h }, { data: f }] = await Promise.all([getHealth(), getFlags()])
      setHealth(h); setFlags(f)
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const healthy = health?.status === 'ok'
  const byType  = flags.reduce((acc, f) => { acc[f.flag_type] = (acc[f.flag_type] || 0) + 1; return acc }, {})
  const enabled = flags.filter((f) => f.enabled).length

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Feature Flag Service overview</Typography>
        </Box>
        <IconButton onClick={load}><RefreshIcon /></IconButton>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
          {healthy ? <CheckCircleIcon sx={{ color: '#34a853', fontSize: 32 }} /> : <ErrorIcon sx={{ color: '#ea4335', fontSize: 32 }} />}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1">Feature Flag Service</Typography>
            <Typography variant="body2" color="text.secondary">
              {health?.timestamp ? `Last checked ${new Date(health.timestamp).toLocaleTimeString()}` : 'Status unknown'}
            </Typography>
          </Box>
          <Chip label={healthy ? 'Healthy' : 'Down'} color={healthy ? 'success' : 'error'}
            icon={healthy ? <CheckCircleIcon /> : <ErrorIcon />} />
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<FlagIcon sx={{ color: '#1a73e8' }} />} label="Total Flags" value={flags.length} color="#1a73e8" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<CheckCircleIcon sx={{ color: '#34a853' }} />} label="Enabled" value={enabled} color="#34a853" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ErrorIcon sx={{ color: '#ea4335' }} />} label="Disabled" value={flags.length - enabled} color="#ea4335" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<CategoryIcon sx={{ color: '#fbbc04' }} />} label="Flag Types" value={Object.keys(byType).length} color="#fbbc04" />
        </Grid>
      </Grid>

      {Object.keys(byType).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Flags by Type</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {Object.entries(byType).map(([type, count]) => (
                <Chip key={type} label={`${type}: ${count}`} variant="outlined" color="primary" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>About Feature Flags</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" paragraph>
            This service manages feature flags for the lsuthar.in platform. Flags control feature availability per user, environment, and traffic percentage using variant weights.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports <strong>boolean</strong>, <strong>string</strong>, <strong>number</strong>, and <strong>multivariate</strong> flag types with per-user overrides for targeted rollouts and A/B testing.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
