import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Box, Typography, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import toast from 'react-hot-toast'
import { getCircuit, resetCircuit } from '../utils/api'

const STATE_CONFIG = {
  CLOSED:    { color: 'success', icon: <CheckCircleIcon />, desc: 'Normal — all requests pass through' },
  HALF_OPEN: { color: 'warning', icon: <WarningIcon />,     desc: 'Probing — testing if upstream recovered' },
  OPEN:      { color: 'error',   icon: <ErrorIcon />,       desc: 'Tripped — all requests fail fast (503)' },
}

export default function CircuitPage() {
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin')
  const [circuits, setCircuits] = useState([])
  const [loading, setLoading] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [resetting, setResetting] = useState(false)

  async function load() {
    setLoading(true)
    try { const { data } = await getCircuit(); setCircuits(data) }
    catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { load(); const t = setInterval(load, 10_000); return () => clearInterval(t) }, [])

  async function handleReset() {
    setResetting(true)
    try {
      await resetCircuit(resetTarget.route)
      toast.success(`${resetTarget.route} reset to CLOSED`); setResetTarget(null); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setResetting(false) }
  }

  const openCount = circuits.filter((c) => c.state === 'OPEN').length

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5">Circuit Breakers</Typography>
          <Typography variant="body2" color={openCount > 0 ? 'error.main' : 'text.secondary'}>
            {openCount > 0 ? `${openCount} circuit(s) OPEN` : 'All circuits healthy'} — auto-refreshes every 10s
          </Typography>
        </Box>
        <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
      </Box>

      {/* State legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(STATE_CONFIG).map(([state, cfg]) => (
          <Card key={state} sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
              <Chip label={state} size="small" color={cfg.color} icon={cfg.icon} />
              <Typography variant="caption" color="text.secondary">{cfg.desc}</Typography>
            </Box>
          </Card>
        ))}
      </Box>

      <Card>
        {loading && circuits.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Route</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>Failures</TableCell>
                  <TableCell>Tripped At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {circuits.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>No routes</TableCell></TableRow>
                )}
                {circuits.map((c) => {
                  const cfg = STATE_CONFIG[c.state] || STATE_CONFIG.CLOSED
                  return (
                    <TableRow key={c.route} hover sx={{ bgcolor: c.state === 'OPEN' ? '#fff3f3' : c.state === 'HALF_OPEN' ? '#fffde7' : 'inherit' }}>
                      <TableCell><Typography fontFamily="monospace" fontWeight={600}>{c.route}</Typography></TableCell>
                      <TableCell><Chip label={c.state} size="small" color={cfg.color} icon={cfg.icon} /></TableCell>
                      <TableCell><Typography color={c.failures > 0 ? 'error.main' : 'text.secondary'}>{c.failures}</Typography></TableCell>
                      <TableCell>
                        {c.tripped_at ? (
                          <Typography variant="body2" color="warning.main">{new Date(c.tripped_at).toLocaleTimeString()}</Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<RestartAltIcon />} color="warning" variant="outlined"
                          disabled={!isAdmin || c.state === 'CLOSED'} onClick={() => setResetTarget(c)}>
                          Reset
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={!!resetTarget} onClose={() => setResetTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Circuit Breaker</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>Only reset if you have confirmed the upstream is healthy.</Alert>
          <Typography>Manually reset <strong>{resetTarget?.route}</strong> from {resetTarget?.state} to CLOSED?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setResetTarget(null)} disabled={resetting}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleReset} disabled={resetting}>
            {resetting ? <CircularProgress size={18} color="inherit" /> : 'Reset to CLOSED'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
