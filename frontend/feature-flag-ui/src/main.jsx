import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Provider, useSelector } from "react-redux"
import { ThemeProvider } from "@mui/material"
import { Toaster } from "react-hot-toast"
import { store } from "./store"
import { theme } from "./theme"
import Layout from "./components/Layout"
import LoginPage from "./pages/LoginPage"
import HomePage from "./pages/HomePage"
import FlagsPage from "./pages/FlagsPage"
import AnalyticsPage from "./pages/AnalyticsPage"

function Guard({ children }) {
  const token = useSelector(s => s.auth.token)
  return token ? children : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Guard><Layout /></Guard>}>
              <Route index element={<HomePage />} />
              <Route path="/flags" element={<FlagsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
)
