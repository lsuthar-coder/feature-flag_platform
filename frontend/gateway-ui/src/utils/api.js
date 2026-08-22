import axios from 'axios'
import { store, authActions } from '../store'

const BASE = 'https://auth-api.flag.lsuthar.in'
const api  = axios.create({ baseURL: BASE, withCredentials: true })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gw_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing = null
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry && !original.url?.includes('/auth/refresh')) {
      original._retry = true
      if (!refreshing) {
        refreshing = axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
          .then(({ data }) => { localStorage.setItem('gw_token', data.accessToken); return data.accessToken })
          .catch(() => { store.dispatch(authActions.logout()); window.location.href = '/login'; return null })
          .finally(() => { refreshing = null })
      }
      const newToken = await refreshing
      if (!newToken) return Promise.reject(err)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    }
    return Promise.reject(err)
  }
)

export const login  = (email, password) => api.post('/auth/login', { email, password })
export const logout = () => api.post('/auth/logout')
export const getMe  = () => api.get('/auth/me')
export const getHealth         = () => api.get('/health')
export const getPlatformHealth = () => api.get('/admin/platform-health')
export const getRoutes         = () => api.get('/admin/routes')
export const createRoute       = (data)     => api.post('/admin/routes', data)
export const updateRoute       = (id, data) => api.put(`/admin/routes/${id}`, data)
export const deleteRoute       = (id)       => api.delete(`/admin/routes/${id}`)
export const getCircuit        = () => api.get('/admin/circuit')
export const resetCircuit      = (route) => api.post(`/admin/circuit/${encodeURIComponent(route.replace(/^\//, ''))}/reset`)
export const getMetrics        = () => api.get('/admin/metrics')
export const getPublicRoutes   = () => api.get('/admin/public-routes')
export const createPublicRoute = (data)     => api.post('/admin/public-routes', data)
export const updatePublicRoute = (id, data) => api.put(`/admin/public-routes/${id}`, data)
export const deletePublicRoute = (id)       => api.delete(`/admin/public-routes/${id}`)
export const getWorkers        = () => api.get('/admin/workers')
export default api
