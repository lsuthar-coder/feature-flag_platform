import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Box, Card, CardContent, TextField, Button, Typography, CircularProgress, InputAdornment, IconButton } from '@mui/material'
import RouterIcon from '@mui/icons-material/Router'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import toast from 'react-hot-toast'
import { login, getMe } from '../utils/api'
import { authActions } from '../store'

export default function LoginPage() {
  const navigate = useNavigate(); const dispatch = useDispatch()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false); const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await login(email, password)
      localStorage.setItem('gw_token', data.accessToken)
      const { data: user } = await getMe()
      dispatch(authActions.setCredentials({ token: data.accessToken, user }))
      toast.success('Welcome back!'); navigate('/')
    } catch (err) { toast.error(err.response?.data?.error || 'Login failed') }
    finally { setLoading(false) }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8f9fa' }}>
      <Card sx={{ width: '100%', maxWidth: 400, p: 2 }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', bgcolor: '#e8f0fe', mb: 2 }}>
              <RouterIcon sx={{ color: '#1a73e8', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" gutterBottom>Gateway Admin</Typography>
            <Typography variant="body2" color="text.secondary">Manage the lsuthar.in API Gateway</Typography>
          </Box>
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Email" type="email" margin="normal" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField fullWidth label="Password" margin="normal" required
              type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPwd(!showPwd)} edge="end">
                    {showPwd ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ) }} />
            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.5 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
