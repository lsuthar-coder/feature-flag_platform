import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Toaster } from 'react-hot-toast'
import { store } from './store'
import { theme } from './theme'
import { ProtectedLayout } from './App'
import LoginPage        from './pages/LoginPage'
import HomePage         from './pages/HomePage'
import RoutesPage       from './pages/RoutesPage'
import CircuitPage      from './pages/CircuitPage'
import PublicRoutesPage from './pages/PublicRoutesPage'
import MetricsPage      from './pages/MetricsPage'
import WorkersPage      from './pages/WorkersPage'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: 8, fontSize: 14 } }} />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout />}>
              <Route index element={<HomePage />} />
              <Route path="/routes"        element={<RoutesPage />} />
              <Route path="/circuit"       element={<CircuitPage />} />
              <Route path="/public-routes" element={<PublicRoutesPage />} />
              <Route path="/metrics"       element={<MetricsPage />} />
              <Route path="/workers"       element={<WorkersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
)
