import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Divider, Alert, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import toast from 'react-hot-toast'
import { getPublicRoutes, createPublicRoute, deletePublicRoute } from '../utils/api'

export default function PublicRoutesPage() {
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin')
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ path: '', match_type: 'exact', description: '' })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try { const { data } = await getPublicRoutes(); setRoutes(data) }
    catch (_) { toast.error('Failed to load public routes') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true)
    try {
      await createPublicRoute(form)
      toast.success(`Public route "${form.path}" added`)
      setForm({ path: '', match_type: 'exact', description: '' }); setCreateOpen(false); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deletePublicRoute(deleteTarget.id)
      toast.success(`Public route "${deleteTarget.path}" deleted`); setDeleteTarget(null); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setDeleting(false) }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5">Public Routes</Typography>
          <Typography variant="body2" color="text.secondary">Paths that bypass JWT authentication</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} disabled={!isAdmin} onClick={() => setCreateOpen(true)}>Add Public Route</Button>
        </Box>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        Public routes skip JWT verification. Only add paths that are genuinely public (e.g. login, register, health checks).
      </Alert>

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Path</TableCell>
                  <TableCell>Match Type</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>No public routes</TableCell></TableRow>
                )}
                {routes.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell><Typography fontFamily="monospace" fontWeight={600} color="warning.dark">{r.path}</Typography></TableCell>
                    <TableCell><Chip label={r.match_type} size="small" color={r.match_type === 'exact' ? 'info' : 'secondary'} /></TableCell>
                    <TableCell>{r.is_system ? <Chip label="system" size="small" variant="outlined" /> : <Chip label="custom" size="small" color="default" />}</TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{r.description || '—'}</Typography></TableCell>
                    <TableCell align="right">
                      <Tooltip title={r.is_system ? 'System routes cannot be deleted' : !isAdmin ? 'Admin only' : 'Delete'}>
                        <span>
                          <IconButton size="small" color="error" disabled={!isAdmin || r.is_system} onClick={() => setDeleteTarget(r)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Add Public Route
            <IconButton onClick={() => setCreateOpen(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
            <TextField label="Path" required fullWidth value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              helperText="Must start with / — cannot be /admin or /internal" />
            <FormControl fullWidth>
              <InputLabel>Match Type</InputLabel>
              <Select value={form.match_type} label="Match Type" onChange={(e) => setForm({ ...form, match_type: e.target.value })}>
                <MenuItem value="exact">exact — only this exact path</MenuItem>
                <MenuItem value="prefix">prefix — this path and all sub-paths</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Description" fullWidth value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={18} color="inherit" /> : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Public Route</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteTarget?.path}</strong>? Requests will require JWT authentication again.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
