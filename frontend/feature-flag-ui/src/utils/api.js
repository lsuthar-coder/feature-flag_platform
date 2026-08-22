import axios from "axios"
import { store } from "../store"
import { authActions } from "../store"
const BASE = import.meta.env.VITE_API_URL || "https://api.lsuthar.in"
const TK = "ff_token"
const api = axios.create({ baseURL: BASE, withCredentials: true })
api.interceptors.request.use(cfg => { const t = localStorage.getItem(TK); if (t) cfg.headers.Authorization = "Bearer " + t; return cfg })
let refreshing = null
api.interceptors.response.use(res => res, async err => {
  const orig = err.config
  if (err.response?.status === 401 && !orig._retry && !orig.url?.includes("/auth/refresh")) {
    orig._retry = true
    if (!refreshing) {
      refreshing = axios.post(BASE + "/auth/refresh", {}, { withCredentials: true })
        .then(({ data }) => { localStorage.setItem(TK, data.accessToken); return data.accessToken })
        .catch(() => { store.dispatch(authActions.logout()); window.location.href = "/login"; return null })
        .finally(() => { refreshing = null })
    }
    const t = await refreshing; if (!t) return Promise.reject(err)
    orig.headers.Authorization = "Bearer " + t; return api(orig)
  }
  return Promise.reject(err)
})
export const login         = (email, pw) => api.post("/auth/login", { email, password: pw })
export const getMe         = ()          => api.get("/auth/me")
export const logout = () => api.post('/auth/logout')
export const getHealth     = ()          => api.get("/health")
export const getFlags      = (env)       => api.get("/flags", { params: env ? { environment: env } : {} })
export const getFlag       = (name)      => api.get("/flags/" + name)
export const createFlag    = (data)      => api.post("/flags", data)
export const updateFlag    = (name, d)   => api.put("/flags/" + name, d)
export const deleteFlag    = (name)      => api.delete("/flags/" + name)
export const createVariant = (fn, d)     => api.post("/flags/" + fn + "/variants", d)
export const updateVariant = (fn, k, d)  => api.put("/flags/" + fn + "/variants/" + k, d)
export const deleteVariant = (fn, k)     => api.delete("/flags/" + fn + "/variants/" + k)
export const createOverride= (fn, d)     => api.post("/flags/" + fn + "/overrides", d)
export const deleteOverride= (fn, uid)   => api.delete("/flags/" + fn + "/overrides/" + uid)
export const getAudit      = (p)         => api.get("/flags/audit", { params: p })
export default api
