import { useCallback, useEffect, useState } from "react"
import { useSelector } from "react-redux"
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Paper, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from "@mui/material"
import { Add, Block, Edit, Refresh } from "@mui/icons-material"
import toast from "react-hot-toast"
import { getUsers, updateRole, revokeSessions, register } from "../utils/api"

export default function UsersPage() {
  const currentUser = useSelector(s => s.auth.user)
  const isAdmin = currentUser?.role === "admin"
  const [users, setUsers] = useState([]), [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false), [createForm, setCreateForm] = useState({ email: "", password: "" }), [creating, setCreating] = useState(false)
  const [roleTarget, setRoleTarget] = useState(null), [newRole, setNewRole] = useState("user"), [roleSaving, setRoleSaving] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState(null), [revoking, setRevoking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await getUsers(); setUsers(data) }
    catch (err) { toast.error(err.response?.data?.error || "Failed to load users") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function handleCreate(e) {
    e.preventDefault(); setCreating(true)
    try { await register(createForm); toast.success("User " + createForm.email + " created"); setCreateOpen(false); setCreateForm({ email: "", password: "" }); load() }
    catch (err) { toast.error(err.response?.data?.error || "Failed") }
    finally { setCreating(false) }
  }
  async function handleRoleChange(e) {
    e.preventDefault(); setRoleSaving(true)
    try { await updateRole(roleTarget.id, newRole); toast.success("Role updated"); setRoleTarget(null); load() }
    catch (err) { toast.error(err.response?.data?.error || "Failed") }
    finally { setRoleSaving(false) }
  }
  async function handleRevoke() {
    setRevoking(true)
    try { await revokeSessions(revokeTarget.id); toast.success("Sessions revoked for " + revokeTarget.email); setRevokeTarget(null) }
    catch (err) { toast.error(err.response?.data?.error || "Failed") }
    finally { setRevoking(false) }
  }
  const fmt = d => d ? new Date(d).toLocaleDateString() : "—"

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Users</Typography>
          <Typography variant="body2" color="text.secondary">{users.length} accounts</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<Refresh />} onClick={load} variant="outlined" size="small" disabled={loading}>Refresh</Button>
          <Button startIcon={<Add />} onClick={() => setCreateOpen(true)} variant="contained" size="small" disabled={!isAdmin}>Create User</Button>
        </Box>
      </Box>
      {loading ? <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Created</TableCell><TableCell>Last Login</TableCell><TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.disabled" }}>No users</TableCell></TableRow>}
              {users.map(u => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.email}{u.id === currentUser?.sub && <Chip label="you" size="small" sx={{ ml: 1 }} />}</TableCell>
                  <TableCell><Chip label={u.role} color={u.role === "admin" ? "warning" : "default"} size="small" /></TableCell>
                  <TableCell>{fmt(u.created_at)}</TableCell>
                  <TableCell>{fmt(u.last_login)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                      <Tooltip title={!isAdmin ? "Admin only" : "Change role"}><span>
                        <IconButton size="small" disabled={!isAdmin} onClick={() => { setRoleTarget(u); setNewRole(u.role) }}><Edit fontSize="small" /></IconButton>
                      </span></Tooltip>
                      <Tooltip title={!isAdmin ? "Admin only" : "Revoke sessions"}><span>
                        <Button size="small" color="warning" variant="outlined" startIcon={<Block />} disabled={!isAdmin} onClick={() => setRevokeTarget(u)} sx={{ fontSize: 11 }}>Revoke</Button>
                      </span></Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create User</DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Email" type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} required />
            <TextField label="Password" type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} required helperText="Minimum 8 characters" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creating}>{creating ? <CircularProgress size={18} color="inherit" /> : "Create"}</Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={!!roleTarget} onClose={() => setRoleTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Role</DialogTitle>
        <form onSubmit={handleRoleChange}>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Changing role for <strong>{roleTarget?.email}</strong>. Takes effect on next login.</Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={newRole} onChange={e => setNewRole(e.target.value)}>
                <MenuItem value="user">user</MenuItem><MenuItem value="admin">admin</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRoleTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={roleSaving}>{roleSaving ? <CircularProgress size={18} color="inherit" /> : "Update Role"}</Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={!!revokeTarget} onClose={() => setRevokeTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Revoke Sessions</DialogTitle>
        <DialogContent>
          <Typography>Revoke all sessions for <strong>{revokeTarget?.email}</strong>?</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Access tokens remain valid for up to 15 minutes.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeTarget(null)}>Cancel</Button>
          <Button onClick={handleRevoke} color="warning" variant="contained" disabled={revoking}>{revoking ? <CircularProgress size={18} color="inherit" /> : "Revoke"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
