import { useEffect, useState } from 'react'
import {
  Box, Card, CardContent, Typography, Chip, Divider,
  CircularProgress, Avatar, Grid,
} from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PersonIcon from '@mui/icons-material/Person'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import KeyIcon from '@mui/icons-material/Key'
import { getMe, getPublicKey } from '../utils/api'

function InfoRow({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5 }}>
      <Box sx={{ color: 'text.secondary', mt: 0.3 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600}
          sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>{value}</Typography>
      </Box>
    </Box>
  )
}

export default function HomePage() {
  const [user,      setUser]      = useState(null)
  const [publicKey, setPublicKey] = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [{ data: u }, { data: pk }] = await Promise.all([getMe(), getPublicKey()])
        setUser(u)
        setPublicKey(pk.publicKey)
      } catch (_) {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
  )

  const fmt = (d) => d ? new Date(d).toLocaleString() : 'Never'
  const isAdmin = user?.role === 'admin'

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Profile</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your account information
      </Typography>

      <Grid container spacing={3}>
        {/* Profile card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22 }}>
                  {user?.email?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>{user?.email}</Typography>
                  <Chip
                    label={user?.role} size="small"
                    color={isAdmin ? 'primary' : 'default'}
                    icon={isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <InfoRow icon={<PersonIcon fontSize="small" />} label="User ID"
                value={<span style={{ fontFamily: 'monospace', fontSize: 12 }}>{user?.id}</span>} />
              <Divider />
              <InfoRow icon={<CalendarTodayIcon fontSize="small" />} label="Created"
                value={fmt(user?.created_at)} />
              <Divider />
              <InfoRow icon={<AccessTimeIcon fontSize="small" />} label="Last Login"
                value={fmt(user?.last_login)} />
            </CardContent>
          </Card>
        </Grid>

        {/* Public key card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <KeyIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>RSA Public Key</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                Used by the API Gateway for JWT signature verification
              </Typography>
              <Box sx={{
                bgcolor: '#f8f9fa', borderRadius: 1, p: 2,
                fontFamily: 'monospace', fontSize: 10,
                wordBreak: 'break-all', maxHeight: 180, overflow: 'auto',
                border: '1px solid #e0e0e0',
              }}>
                {publicKey || 'Not available'}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
