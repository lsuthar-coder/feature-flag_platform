import { useEffect, useState } from 'react'
import { Box, Typography, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, IconButton } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import CloudIcon from '@mui/icons-material/Cloud'
import { getWorkers } from '../utils/api'
import toast from 'react-hot-toast'

export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try { const { data } = await getWorkers(); setWorkers(data) }
    catch (_) { toast.error('Failed to load workers') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5">Cloudflare Workers</Typography>
          <Typography variant="body2" color="text.secondary">Edge workers and their status</Typography>
        </Box>
        <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
      </Box>

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : workers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CloudIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
            <Typography color="text.secondary">No workers registered</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Worker Name</TableCell>
                  <TableCell>Trigger / Route</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Deployed</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workers.map((w) => (
                  <TableRow key={w.id || w.name} hover>
                    <TableCell>
                      <Typography fontFamily="monospace" fontWeight={600}>{w.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontFamily="monospace" fontSize={12} color="text.secondary">{w.trigger || w.route || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      {w.status === 'active' || w.status === 'ok'
                        ? <Chip label="Active" size="small" color="success" icon={<CheckCircleIcon />} />
                        : <Chip label={w.status || 'Unknown'} size="small" color="error" icon={<ErrorIcon />} />}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {w.last_deployed ? new Date(w.last_deployed).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{w.description || '—'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  )
}
