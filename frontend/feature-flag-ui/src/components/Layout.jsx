import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AppBar, Toolbar, Typography, Box, Avatar, Menu, MenuItem, Divider, ListItemIcon, Tabs, Tab } from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import LogoutIcon from '@mui/icons-material/Logout'
import { authActions } from '../store'
import { logout } from '../utils/api'
import toast from 'react-hot-toast'

const TABS = [
  { label: 'Home',      path: '/'          },
  { label: 'Flags',     path: '/flags'     },
  { label: 'Analytics', path: '/analytics' },
]

export default function Layout({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const dispatch  = useDispatch()
  const user      = useSelector((s) => s.auth.user)
  const [anchor, setAnchor] = useState(null)

  const currentTab = TABS.findIndex((t) =>
    t.path === '/' ? location.pathname === '/' : location.pathname.startsWith(t.path)
  )

  async function handleLogout() {
    try { await logout() } catch (_) {}
    dispatch(authActions.logout())
    navigate('/login')
    toast.success('Signed out')
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar sx={{ gap: 2 }}>
          <FlagIcon color="primary" />
          <Typography variant="h6" color="primary" sx={{ flexGrow: 0, mr: 2 }}>Feature Flags</Typography>
          <Tabs value={currentTab === -1 ? false : currentTab} sx={{ flexGrow: 1 }}>
            {TABS.map((t) => (
              <Tab key={t.path} label={t.label} component={Link} to={t.path}
                sx={{ textTransform: 'none', fontWeight: 500 }} />
            ))}
          </Tabs>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', cursor: 'pointer', fontSize: 14 }}
            onClick={(e) => setAnchor(e.currentTarget)}>
            {user?.email?.[0]?.toUpperCase()}
          </Avatar>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}
            PaperProps={{ sx: { minWidth: 200, borderRadius: 2, mt: 1 } }}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" fontWeight={500}>{user?.email}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 4 }}>{children}</Box>
    </Box>
  )
}
