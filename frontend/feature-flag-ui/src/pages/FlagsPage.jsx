import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, LinearProgress, Tooltip, Divider, Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import PeopleIcon from '@mui/icons-material/People'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import toast from 'react-hot-toast'
import {
  getFlags, createFlag, deleteFlag, updateFlag,
  getFlag, createVariant, updateVariant, deleteVariant,
  createOverride, deleteOverride,
} from '../utils/api'

const TYPE_COLORS = { boolean: 'primary', string: 'secondary', number: 'warning', multivariate: 'info' }

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

function CreateFlagDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', flag_type: 'boolean', environment: 'production', description: '' })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      await createFlag(form)
      toast.success(`Flag "${form.name}" created`)
      setForm({ name: '', flag_type: 'boolean', environment: 'production', description: '' })
      onCreated(); onClose()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create flag') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create Feature Flag</DialogTitle>
        <Divider />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
          <TextField label="Flag Name" required fullWidth value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            helperText="Lowercase letters, numbers, hyphens only" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={form.flag_type} label="Type" onChange={(e) => setForm({ ...form, flag_type: e.target.value })}>
                <MenuItem value="boolean">Boolean</MenuItem>
                <MenuItem value="string">String</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="multivariate">Multivariate</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Environment</InputLabel>
              <Select value={form.environment} label="Environment" onChange={(e) => setForm({ ...form, environment: e.target.value })}>
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="staging">Staging</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TextField label="Description" fullWidth multiline rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Create Flag'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function OverridesDialog({ open, onClose, flagName, variants }) {
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin')
  const [overrides, setOverrides] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ userId: '', variantKey: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!flagName) return
    setLoading(true)
    try { const { data } = await getFlag(flagName); setOverrides(data.overrides || []) }
    catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { if (open) load() }, [open, flagName])

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true)
    try {
      await createOverride(flagName, { userId: form.userId, variantKey: form.variantKey })
      toast.success('Override added')
      setForm({ userId: '', variantKey: '' }); setAdding(false); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteOverride(flagName, deleteTarget.user_id)
      toast.success('Override removed'); setDeleteTarget(null); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setDeleting(false) }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Overrides — {flagName}
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>Overrides bypass weight-based assignment. The user always gets the specified variant.</Alert>
              {overrides.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>No overrides yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User ID</TableCell>
                        <TableCell>Variant</TableCell>
                        <TableCell>Created By</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overrides.map((o) => (
                        <TableRow key={o.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{o.user_id}</TableCell>
                          <TableCell><Chip label={o.variant_key} size="small" color="primary" /></TableCell>
                          <TableCell>{o.created_by || '—'}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="error" disabled={!isAdmin} onClick={() => setDeleteTarget(o)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {adding ? (
                <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 2, mt: 3, alignItems: 'flex-start' }}>
                  <TextField label="User ID" required size="small" sx={{ flex: 2 }}
                    value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
                  <FormControl size="small" sx={{ flex: 1 }} required>
                    <InputLabel>Variant</InputLabel>
                    <Select value={form.variantKey} label="Variant" onChange={(e) => setForm({ ...form, variantKey: e.target.value })}>
                      {variants.map((v) => <MenuItem key={v.key} value={v.key}>{v.key} ({v.value})</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Button type="submit" variant="contained" size="small" disabled={saving}>
                    {saving ? <CircularProgress size={16} color="inherit" /> : 'Add'}
                  </Button>
                  <Button size="small" onClick={() => setAdding(false)}>Cancel</Button>
                </Box>
              ) : (
                <Button startIcon={<AddIcon />} sx={{ mt: 2 }} disabled={!isAdmin} onClick={() => setAdding(true)}>Add Override</Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Remove Override" message={`Remove override for user ${deleteTarget?.user_id?.slice(0, 20)}...?`} />
    </>
  )
}

function FlagDetailDialog({ open, onClose, flagName, onUpdated }) {
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin')
  const [flag, setFlag] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editDesc, setEditDesc] = useState(false)
  const [editEnv, setEditEnv] = useState(false)
  const [descVal, setDescVal] = useState('')
  const [envVal, setEnvVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingVariant, setAddingVariant] = useState(false)
  const [variantForm, setVariantForm] = useState({ key: '', value: '', weight: 0, isDefault: false })
  const [editingWeight, setEditingWeight] = useState(null)
  const [weightVal, setWeightVal] = useState(0)
  const [deleteVariantTarget, setDeleteVariantTarget] = useState(null)
  const [deletingVariant, setDeletingVariant] = useState(false)
  const [variantSaving, setVariantSaving] = useState(false)

  async function load() {
    if (!flagName) return
    setLoading(true)
    try {
      const { data } = await getFlag(flagName)
      setFlag(data); setDescVal(data.description || ''); setEnvVal(data.environment || 'production')
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { if (open) load() }, [open, flagName])

  async function handleSaveDesc() {
    setSaving(true)
    try { await updateFlag(flagName, { description: descVal }); toast.success('Description updated'); setEditDesc(false); load(); onUpdated() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleSaveEnv() {
    setSaving(true)
    try { await updateFlag(flagName, { environment: envVal }); toast.success('Environment updated'); setEditEnv(false); load(); onUpdated() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleAddVariant(e) {
    e.preventDefault(); setVariantSaving(true)
    try {
      await createVariant(flagName, variantForm)
      toast.success(`Variant "${variantForm.key}" added`)
      setVariantForm({ key: '', value: '', weight: 0, isDefault: false }); setAddingVariant(false); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setVariantSaving(false) }
  }

  async function handleSaveWeight(key) {
    try { await updateVariant(flagName, key, { weight: Number(weightVal) }); toast.success('Weight updated'); setEditingWeight(null); load() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  async function handleDeleteVariant() {
    setDeletingVariant(true)
    try { await deleteVariant(flagName, deleteVariantTarget.key); toast.success(`Variant deleted`); setDeleteVariantTarget(null); load() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setDeletingVariant(false) }
  }

  const totalWeight = flag?.variants?.reduce((s, v) => s + v.weight, 0) || 0

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" fontFamily="monospace">{flagName}</Typography>
            {flag && <Chip label={flag.flag_type} size="small" color={TYPE_COLORS[flag.flag_type] || 'default'} />}
          </Box>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : flag ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Description */}
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Description</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  {editDesc ? (
                    <>
                      <TextField fullWidth size="small" value={descVal} onChange={(e) => setDescVal(e.target.value)} />
                      <Tooltip title="Save"><IconButton size="small" color="primary" onClick={handleSaveDesc} disabled={saving}>
                        {saving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                      </IconButton></Tooltip>
                      <Tooltip title="Cancel"><IconButton size="small" onClick={() => { setEditDesc(false); setDescVal(flag.description || '') }}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                    </>
                  ) : (
                    <>
                      <Typography flex={1} color={flag.description ? 'text.primary' : 'text.disabled'}>{flag.description || 'No description'}</Typography>
                      {isAdmin && <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditDesc(true)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                    </>
                  )}
                </Box>
              </Box>
              {/* Environment */}
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Environment</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  {editEnv ? (
                    <>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select value={envVal} onChange={(e) => setEnvVal(e.target.value)}>
                          <MenuItem value="production">Production</MenuItem>
                          <MenuItem value="staging">Staging</MenuItem>
                        </Select>
                      </FormControl>
                      <Tooltip title="Save"><IconButton size="small" color="primary" onClick={handleSaveEnv} disabled={saving}>
                        {saving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                      </IconButton></Tooltip>
                      <Tooltip title="Cancel"><IconButton size="small" onClick={() => { setEditEnv(false); setEnvVal(flag.environment) }}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                    </>
                  ) : (
                    <>
                      <Chip label={flag.environment} size="small" variant="outlined" />
                      {isAdmin && <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditEnv(true)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                    </>
                  )}
                </Box>
              </Box>
              {/* Variants */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Variants ({flag.variants?.length || 0}) — total weight: {totalWeight}/100
                  </Typography>
                  {isAdmin && <Button size="small" startIcon={<AddIcon />} onClick={() => setAddingVariant(true)}>Add Variant</Button>}
                </Box>
                <LinearProgress variant="determinate" value={Math.min(totalWeight, 100)}
                  color={totalWeight === 100 ? 'success' : 'primary'} sx={{ mb: 1.5, borderRadius: 1, height: 6 }} />
                {flag.variants?.length === 0 ? (
                  <Typography color="text.secondary" fontSize={14}>No variants yet.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Key</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell>Weight</TableCell>
                          <TableCell>Default</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {flag.variants.map((v) => (
                          <TableRow key={v.key} hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{v.key}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{v.value}</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>
                              {editingWeight === v.key ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <TextField type="number" size="small" sx={{ width: 70 }} value={weightVal}
                                    onChange={(e) => setWeightVal(e.target.value)} inputProps={{ min: 0, max: 100 }} />
                                  <IconButton size="small" color="primary" onClick={() => handleSaveWeight(v.key)}><SaveIcon fontSize="small" /></IconButton>
                                  <IconButton size="small" onClick={() => setEditingWeight(null)}><CloseIcon fontSize="small" /></IconButton>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress variant="determinate" value={v.weight} sx={{ flex: 1, borderRadius: 1, height: 6 }} />
                                  <Typography fontSize={12}>{v.weight}%</Typography>
                                  {isAdmin && <IconButton size="small" onClick={() => { setEditingWeight(v.key); setWeightVal(v.weight) }}><EditIcon fontSize="small" /></IconButton>}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>{v.is_default && <CheckCircleIcon fontSize="small" color="success" />}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="error" disabled={!isAdmin} onClick={() => setDeleteVariantTarget(v)}><DeleteIcon fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {addingVariant && (
                  <Box component="form" onSubmit={handleAddVariant} sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <TextField label="Key" required size="small" sx={{ width: 120 }} value={variantForm.key} onChange={(e) => setVariantForm({ ...variantForm, key: e.target.value })} />
                    <TextField label="Value" required size="small" sx={{ width: 120 }} value={variantForm.value} onChange={(e) => setVariantForm({ ...variantForm, value: e.target.value })} />
                    <TextField label="Weight" type="number" size="small" sx={{ width: 90 }} value={variantForm.weight} onChange={(e) => setVariantForm({ ...variantForm, weight: Number(e.target.value) })} inputProps={{ min: 0, max: 100 }} />
                    <Button type="submit" variant="contained" size="small" disabled={variantSaving}>
                      {variantSaving ? <CircularProgress size={16} color="inherit" /> : 'Add'}
                    </Button>
                    <Button size="small" onClick={() => setAddingVariant(false)}>Cancel</Button>
                  </Box>
                )}
              </Box>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteVariantTarget} onClose={() => setDeleteVariantTarget(null)}
        onConfirm={handleDeleteVariant} loading={deletingVariant}
        title="Delete Variant" message={`Delete variant "${deleteVariantTarget?.key}"?`} />
    </>
  )
}

export default function FlagsPage() {
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin')
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailFlag, setDetailFlag] = useState(null)
  const [overridesFlag, setOverridesFlag] = useState(null)
  const [overridesVariants, setOverridesVariants] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try { const { data } = await getFlags(); setFlags(data) }
    catch (_) { toast.error('Failed to load flags') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteFlag(deleteTarget.name)
      toast.success(`Flag "${deleteTarget.name}" deleted`); setDeleteTarget(null); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete') }
    finally { setDeleting(false) }
  }

  const filtered = flags.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) || (f.description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5">Feature Flags</Typography>
          <Typography variant="body2" color="text.secondary">{flags.length} flags</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} disabled={!isAdmin} onClick={() => setCreateOpen(true)}>New Flag</Button>
      </Box>

      <TextField fullWidth placeholder="Search flags..." size="small" sx={{ mb: 2 }} value={search} onChange={(e) => setSearch(e.target.value)} />

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Environment</TableCell>
                  <TableCell>Variants</TableCell>
                  <TableCell align="center">Overrides</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {search ? 'No flags match your search' : 'No flags yet.'}
                  </TableCell></TableRow>
                )}
                {filtered.map((flag) => (
                  <TableRow key={flag.id} hover>
                    <TableCell>
                      <Typography fontFamily="monospace" fontWeight={500} color="primary"
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => setDetailFlag(flag.name)}>
                        {flag.name}
                      </Typography>
                      {flag.description && <Typography variant="caption" color="text.secondary" display="block">{flag.description}</Typography>}
                    </TableCell>
                    <TableCell><Chip label={flag.flag_type} size="small" color={TYPE_COLORS[flag.flag_type] || 'default'} /></TableCell>
                    <TableCell>
                      {flag.enabled
                        ? <Chip label="Enabled" size="small" color="success" icon={<CheckCircleIcon />} />
                        : <Chip label="Disabled" size="small" color="default" icon={<CancelIcon />} />}
                    </TableCell>
                    <TableCell><Chip label={flag.environment} size="small" variant="outlined" /></TableCell>
                    <TableCell>{flag.variants?.length ?? 0}</TableCell>
                    <TableCell align="center">
                      <Button size="small" startIcon={<PeopleIcon />} variant="outlined"
                        onClick={() => { setOverridesFlag(flag.name); setOverridesVariants(flag.variants || []) }}>
                        View Overrides
                      </Button>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={!isAdmin ? 'Admin only' : 'Delete flag'}>
                        <span>
                          <IconButton color="error" size="small" disabled={!isAdmin} onClick={() => setDeleteTarget(flag)}>
                            <DeleteIcon />
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

      <CreateFlagDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <FlagDetailDialog open={!!detailFlag} onClose={() => setDetailFlag(null)} flagName={detailFlag} onUpdated={load} />
      <OverridesDialog open={!!overridesFlag} onClose={() => setOverridesFlag(null)} flagName={overridesFlag} variants={overridesVariants} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Flag" message={`Delete flag "${deleteTarget?.name}" and all its variants and overrides?`} />
    </Box>
  )
}
