import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  CircularProgress, Alert, Divider, InputAdornment, IconButton,
} from '@mui/material'
import LockResetIcon from '@mui/icons-material/LockReset'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import toast from 'react-hot-toast'
import { changePassword } from '../utils/api'
import { authActions } from '../store'

export default function AccountPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [show, setShow] = useState({ current: false, newPwd: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const mismatch = form.newPassword && form.confirm && form.newPassword !== form.confirm
  const tooShort = form.newPassword.length > 0 && form.newPassword.length < 8

  async function handleSubmit(e) {
    e.preventDefault()
    if (mismatch || tooShort) return
    setSaving(true)
    try {
      await changePassword(form.currentPassword, form.newPassword)
      toast.success('Password updated. Please sign in again.')
      setSuccess(true)
      // Logout after password change (server revokes sessions)
      setTimeout(() => {
        dispatch(authActions.logout())
        navigate('/login')
      }, 2000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally { setSaving(false) }
  }

  function PwdField({ label, field, showKey }) {
    return (
      <TextField
        fullWidth label={label} margin="normal" required
        type={show[showKey] ? 'text' : 'password'}
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShow({ ...show, [showKey]: !show[showKey] })} edge="end">
                {show[showKey] ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    )
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Account</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your account settings
      </Typography>

      <Card sx={{ maxWidth: 480 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <LockResetIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>Change Password</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          {success ? (
            <Alert severity="success">
              Password updated. Redirecting to login...
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Changing your password will sign you out of all devices.
              </Alert>

              <PwdField label="Current Password" field="currentPassword" showKey="current" />
              <PwdField label="New Password" field="newPassword" showKey="newPwd" />
              {tooShort && (
                <Typography variant="caption" color="error">Minimum 8 characters</Typography>
              )}
              <PwdField label="Confirm New Password" field="confirm" showKey="confirm" />
              {mismatch && (
                <Typography variant="caption" color="error">Passwords do not match</Typography>
              )}

              <Button
                type="submit" variant="contained" fullWidth size="large"
                disabled={saving || mismatch || tooShort}
                sx={{ mt: 3, py: 1.5 }}
              >
                {saving ? <CircularProgress size={22} color="inherit" /> : 'Update Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
