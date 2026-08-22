import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Tooltip, Divider, Switch, FormControlLabel, Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import toast from 'react-hot-toast'
import { getRoutes, createRoute, updateRoute, deleteRoute } from '../utils/api'

const CB_COLORS = { CLOSED: 'success', HALF_OPEN: 'warning', OPEN: 'error' }

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><Typography>{message}</Typography></DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={loading}>
          {loading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function RouteFormDialog({ open, onClose, editRoute, onSaved }) {
  const isEdit = !!editRoute
  const emptyForm = { path_prefix: '', upstream_url: '', rate_limit_per_min: 60, description: '', flag_name: '', canary_enabled: false, upstream_b_url: '', canary_percentage: 0 }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(isEdit ? { ...emptyForm, ...editRoute } : emptyForm)
  }, [open, editRoute])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (isEdit) {
        await updateRoute(editRoute.id, form)
        toast.success(`Route "${editRoute.path_prefix}" updated`)
      } else {
        await createRoute(form)
        toast.success(`Route "${form.path_prefix}" created`)
      }
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isEdit ? `Edit Route: ${editRoute?.path_prefix}` : 'Add Route'}
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
          {!isEdit && (
            <TextField label="Path Prefix" required fullWidth value={form.path_prefix}
              onChange={(e) => set('path_prefix', e.target.value)}
              helperText="e.g. /auth, /flags, /pdf" />
          )}
          <TextField label="Upstream URL" required fullWidth value={form.upstream_url}
            onChange={(e) => set('upstream_url', e.target.value)}
            helperText="e.g. http://auth-service.platform.svc.cluster.local:5000/auth" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Rate Limit / min" type="number" sx={{ flex: 1 }}
              value={form.rate_limit_per_min} onChange={(e) => set('rate_limit_per_min', Number(e.target.value))} />
            <TextField label="Feature Flag (optional)" sx={{ flex: 1 }}
              value={form.flag_name || ''} onChange={(e) => set('flag_name', e.target.value)}
              helperText="For canary via flags" />
          </Box>
          <TextField label="Description" fullWidth value={form.description || ''}
            onChange={(e) => set('description', e.target.value)} />
          <FormControlLabel
            control={<Switch checked={!!form.canary_enabled} onChange={(e) => set('canary_enabled', e.target.checked)} />}
            label="Enable legacy canary (2 upstreams, percentage-based)" />
          {form.canary_enabled && (
            <Box sx={{ display: 'flex', gap: 2, pl: 2, borderLeft: '3px solid #1a73e8' }}>
              <TextField label="Upstream B URL" sx={{ flex: 2 }} value={form.upstream_b_url || ''}
                onChange={(e) => set('upstream_b_url', e.target.value)} />
              <TextField label="Canary %" type="number" sx={{ flex: 1 }}
                value={form.canary_percentage} onChange={(e) => set('canary_percentage', Number(e.target.value))}
                inputProps={{ min: 0, max: 100 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : isEdit ? 'Save Changes' : 'Create Route'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default function RoutesPage() {
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin')
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editRoute, setEditRoute] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try { const { data } = await getRoutes(); setRoutes(data) }
    catch (_) { toast.error('Failed to load routes') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteRoute(deleteTarget.id)
      toast.success(`Route "${deleteTarget.path_prefix}" deleted`); setDeleteTarget(null); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setDeleting(false) }
  }

  function openEdit(route) { setEditRoute(route); setFormOpen(true) }
  function openCreate() { setEditRoute(null); setFormOpen(true) }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5">Routes</Typography>
          <Typography variant="body2" color="text.secondary">{routes.length} routes — reloaded every 30s</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} disabled={!isAdmin} onClick={openCreate}>Add Route</Button>
        </Box>
      </Box>

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Path Prefix</TableCell>
                  <TableCell>Upstream URL</TableCell>
                  <TableCell>Rate Limit</TableCell>
                  <TableCell>Circuit</TableCell>
                  <TableCell>Req/h</TableCell>
                  <TableCell>Errors/h</TableCell>
                  <TableCell>Routing</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.length === 0 && (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No routes configured</TableCell></TableRow>
                )}
                {routes.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography fontFamily="monospace" fontWeight={600} color="primary">{r.path_prefix}</Typography>
                      {r.description && <Typography variant="caption" color="text.secondary" display="block">{r.description}</Typography>}
                    </TableCell>
                    <TableCell><Typography fontFamily="monospace" fontSize={11} color="text.secondary">{r.upstream_url}</Typography></TableCell>
                    <TableCell>{r.rate_limit_per_min}/min</TableCell>
                    <TableCell>
                      <Chip label={r.circuit_state || 'CLOSED'} size="small"
                        color={CB_COLORS[r.circuit_state] || 'success'} />
                    </TableCell>
                    <TableCell>{r.requests_last_hour ?? 0}</TableCell>
                    <TableCell>
                      <Typography color={r.errors_last_hour > 0 ? 'error.main' : 'text.secondary'}>
                        {r.errors_last_hour ?? 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {r.flag_name
                        ? <Chip label={`flag: ${r.flag_name}`} size="small" color="info" />
                        : r.canary_enabled
                          ? <Chip label={`canary ${r.canary_percentage}%`} size="small" color="warning" />
                          : <Chip label="static" size="small" variant="outlined" />}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title={!isAdmin ? 'Admin only' : 'Edit'}><span>
                          <IconButton size="small" disabled={!isAdmin} onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton>
                        </span></Tooltip>
                        <Tooltip title={!isAdmin ? 'Admin only' : 'Delete'}><span>
                          <IconButton size="small" color="error" disabled={!isAdmin} onClick={() => setDeleteTarget(r)}><DeleteIcon fontSize="small" /></IconButton>
                        </span></Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <RouteFormDialog open={formOpen} onClose={() => setFormOpen(false)} editRoute={editRoute} onSaved={load} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Route" message={`Delete route "${deleteTarget?.path_prefix}"? Traffic to this path will return 404 within 30s.`} />
    </Box>
  )
}
