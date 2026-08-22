import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { Box, Button, CircularProgress, Paper, TextField, Typography } from "@mui/material"
import { Lock } from "@mui/icons-material"
import toast from "react-hot-toast"
import { login, getMe } from "../utils/api"
import { authActions } from "../store"
export default function LoginPage() {
  const nav = useNavigate(), dispatch = useDispatch()
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [loading, setLoading] = useState(false)
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await login(email, password)
      localStorage.setItem("auth_token", data.accessToken)
      const { data: user } = await getMe()
      dispatch(authActions.setCredentials({ token: data.accessToken, user }))
      toast.success("Welcome, " + user.email); nav("/")
    } catch (err) { toast.error(err.response?.data?.error || "Login failed") }
    finally { setLoading(false) }
  }
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
      <Paper elevation={3} sx={{ p: 4, width: 380, borderRadius: 3 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box sx={{ display: "inline-flex", p: 1.5, bgcolor: "primary.main", borderRadius: 2, mb: 2 }}>
            <Lock sx={{ color: "#fff", fontSize: 32 }} />
          </Box>
          <Typography variant="h5" gutterBottom>Auth Service</Typography>
          <Typography variant="body2" color="text.secondary">lsuthar.in platform</Typography>
        </Box>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required sx={{ mb: 2 }} />
          <TextField fullWidth label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required sx={{ mb: 3 }} />
          <Button fullWidth variant="contained" type="submit" disabled={loading} size="large">
            {loading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
          </Button>
        </form>
      </Paper>
    </Box>
  )
}
