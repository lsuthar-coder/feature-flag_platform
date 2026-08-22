import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Tooltip, Typography } from "@mui/material"
import { Group, Lock, Logout, Person, Security } from "@mui/icons-material"
import { authActions } from "../store"
const W = 220
const NAV = [
  { to: "/",        icon: <Person />,   label: "Profile"  },
  { to: "/users",   icon: <Group />,    label: "Users"    },
  { to: "/security",icon: <Security />, label: "Security" },
]
export default function Layout() {
  const dispatch = useDispatch(), nav = useNavigate()
  const user = useSelector(s => s.auth.user)
  const [anchor, setAnchor] = useState(null)
  return (
    <Box sx={{ display: "flex" }}>
      <Drawer variant="permanent" sx={{ width: W, "& .MuiDrawer-paper": { width: W, bgcolor: "#fff", borderRight: "1px solid #e0e0e0" } }}>
        <Toolbar sx={{ px: 2 }}>
          <Lock sx={{ color: "primary.main", mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={600} color="primary.main">Auth Service</Typography>
        </Toolbar>
        <Divider />
        <List dense sx={{ px: 1, mt: 1 }}>
          {NAV.map(({ to, icon, label }) => (
            <ListItem key={to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton component={NavLink} to={to} end={to === "/"}
                sx={{ borderRadius: 2, "&.active": { bgcolor: "primary.main", color: "#fff", "& .MuiListItemIcon-root": { color: "#fff" } } }}>
                <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>{icon}</ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: "#fff", borderBottom: "1px solid #e0e0e0" }}>
          <Toolbar>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title={user?.email || "User"}>
              <IconButton onClick={e => setAnchor(e.currentTarget)}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}>{user?.email?.[0]?.toUpperCase() || "U"}</Avatar>
              </IconButton>
            </Tooltip>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
              <MenuItem disabled><Person sx={{ mr: 1, fontSize: 18 }} />{user?.email}</MenuItem>
              <Divider />
              <MenuItem onClick={() => { dispatch(authActions.logout()); nav("/login") }}><Logout sx={{ mr: 1, fontSize: 18 }} />Logout</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: "background.default" }}><Outlet /></Box>
      </Box>
    </Box>
  )
}
