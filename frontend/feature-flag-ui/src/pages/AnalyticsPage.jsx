import { Box, Paper, Typography } from "@mui/material"
import { BarChart } from "@mui/icons-material"
export default function AnalyticsPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>Analytics</Typography>
      <Paper elevation={1} sx={{ p: 8, textAlign: "center", borderRadius: 3 }}>
        <BarChart sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>Will be soon available</Typography>
        <Typography variant="body2" color="text.disabled">
          Analytics will show flag evaluation counts, variant distribution, override usage,<br/>
          and audit trends once Prometheus is configured.
        </Typography>
      </Paper>
    </Box>
  )
}
