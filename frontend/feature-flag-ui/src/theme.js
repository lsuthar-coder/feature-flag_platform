import { createTheme } from "@mui/material"
export const theme = createTheme({
  palette: {
    primary:    { main: "#1a73e8" },
    secondary:  { main: "#34a853" },
    error:      { main: "#ea4335" },
    warning:    { main: "#fbbc04" },
    background: { default: "#f8f9fa", paper: "#ffffff" },
  },
  typography: {
    fontFamily: "\"Google Sans\", \"Roboto\", sans-serif",
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton:    { styleOverrides: { root: { textTransform: "none", borderRadius: 8, fontWeight: 500 } } },
    MuiPaper:     { styleOverrides: { root: { borderRadius: 12 } } },
    MuiChip:      { styleOverrides: { root: { borderRadius: 6 } } },
    MuiTableHead: { styleOverrides: { root: { "& th": { fontWeight: 600, backgroundColor: "#f1f3f4" } } } },
    MuiDialog:    { styleOverrides: { paper: { borderRadius: 12 } } },
    MuiTextField: { defaultProps: { size: "small" } },
  },
})
