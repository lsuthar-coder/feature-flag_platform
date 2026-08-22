import { Box, Card, CardContent, Chip, Divider, Paper, Typography } from "@mui/material"
import { Security, VpnKey, Info } from "@mui/icons-material"

export default function SecurityPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>Security Info</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <VpnKey color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>JWT Configuration</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary">Algorithm</Typography>
              <Chip label="RS256" size="small" color="primary" sx={{ width: "fit-content" }} />
              <Typography variant="body2" color="text.secondary">Access Token TTL</Typography>
              <Typography variant="body2">15 minutes</Typography>
              <Typography variant="body2" color="text.secondary">Refresh Token</Typography>
              <Typography variant="body2">httpOnly cookie (auto-sent by browser)</Typography>
              <Typography variant="body2" color="text.secondary">Token Blacklist</Typography>
              <Typography variant="body2">Redis (auto-expires with token TTL)</Typography>
              <Typography variant="body2" color="text.secondary">Public Key</Typography>
              <Typography variant="body2">Available at GET /auth/public-key (no auth required)</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Security color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>Password Security</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary">Hash Function</Typography>
              <Chip label="scrypt" size="small" color="secondary" sx={{ width: "fit-content" }} />
              <Typography variant="body2" color="text.secondary">Parameters</Typography>
              <Typography variant="body2">N=16384, r=8, p=1 (equivalent to bcrypt cost-12)</Typography>
              <Typography variant="body2" color="text.secondary">Salt</Typography>
              <Typography variant="body2">16 random bytes, unique per password</Typography>
              <Typography variant="body2" color="text.secondary">Output</Typography>
              <Typography variant="body2">64-byte key stored as hex</Typography>
            </Box>
          </CardContent>
        </Card>
        <Paper elevation={0} sx={{ p: 2, bgcolor: "#e8f4fd", borderRadius: 2, display: "flex", gap: 1 }}>
          <Info sx={{ color: "primary.main", mt: 0.2 }} />
          <Typography variant="body2">
            To change your password, go to the Profile page. Changing password revokes all active sessions and refresh tokens,
            forcing re-login on all devices.
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}
