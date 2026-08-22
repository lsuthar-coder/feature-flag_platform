import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, TextField, Typography,
} from "@mui/material"
import { AccountCircle, Key, Schedule, Shield } from "@mui/icons-material"
import toast from "react-hot-toast"
import { getMe, changePassword, getPublicKey } from "../utils/api"

export default function ProfilePage() {
  const storeUser = useSelector(s => s.auth.user)
  const [user,       setUser]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [pubKey,     setPubKey]     = useState(null)
  const [keyLoading, setKeyLoading] = useState(false)
  const [keyOpen,    setKeyOpen]    = useState(false)

  const [pwForm,    setPwForm]    = useState({ currentPassword: "", newPassword: "", confirm: "" })
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    getMe().then(({ data }) => setUser(data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleChangePassword(e) {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) { toast.error("Passwords do not match"); return }
    if (pwForm.newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return }
    setPwLoading(true)
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success("Password updated. Please log in again.")
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" })
    } catch (err) { toast.error(err.response?.data?.error || "Failed to change password") }
    finally { setPwLoading(false) }
  }

  async function handleViewPublicKey() {
    setKeyOpen(true); setKeyLoading(true)
    try { const { data } = await getPublicKey(); setPubKey(data.publicKey) }
    catch { toast.error("Failed to fetch public key") }
    finally { setKeyLoading(false) }
  }

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>Profile</Typography>
      <Grid container spacing={3}>
        {/* User info card */}
        <Grid item xs={12} md={6}>
          <Card elevation={1}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <AccountCircle sx={{ fontSize: 56, color: "primary.main" }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>{user?.email}</Typography>
                  <Chip label={user?.role} color={user?.role === "admin" ? "warning" : "default"} size="small" sx={{ mt: 0.5 }} />
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 1.5, alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Shield sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">Role</Typography>
                </Box>
                <Typography variant="body2" fontWeight={500}>{user?.role}</Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Schedule sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">Member since</Typography>
                </Box>
                <Typography variant="body2">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Schedule sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">Last login</Typography>
                </Box>
                <Typography variant="body2">{user?.last_login ? new Date(user.last_login).toLocaleString() : "—"}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />
              <Button startIcon={<Key />} variant="outlined" size="small" onClick={handleViewPublicKey}>
                View RSA Public Key
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Change password card */}
        <Grid item xs={12} md={6}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Change Password</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Changing your password revokes all active sessions and refresh tokens.
              </Typography>
              <form onSubmit={handleChangePassword}>
                <TextField fullWidth label="Current Password" type="password" value={pwForm.currentPassword}
                  onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required sx={{ mb: 2 }} />
                <TextField fullWidth label="New Password" type="password" value={pwForm.newPassword}
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required sx={{ mb: 2 }}
                  helperText="Minimum 8 characters" />
                <TextField fullWidth label="Confirm New Password" type="password" value={pwForm.confirm}
                  onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required sx={{ mb: 2 }} />
                <Button type="submit" variant="contained" disabled={pwLoading} fullWidth>
                  {pwLoading ? <CircularProgress size={20} color="inherit" /> : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Public key dialog */}
      <Dialog open={keyOpen} onClose={() => setKeyOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>RSA Public Key</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This public key is used by the API Gateway to verify JWT signatures locally.
            It is safe to share — only the private key can create new tokens.
          </Typography>
          {keyLoading
            ? <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress /></Box>
            : <Box sx={{ bgcolor: "#f8f9fa", borderRadius: 2, p: 2, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
                {pubKey || "—"}
              </Box>
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { if (pubKey) { navigator.clipboard.writeText(pubKey); toast.success("Copied to clipboard") } }}>Copy</Button>
          <Button onClick={() => setKeyOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
