import axios from "axios"
import { store } from "../store"
import { authActions } from "../store"
const BASE = "https://gateway-api.flag.lsuthar.in"
const TK = "auth_token"
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
export const register      = (d)         => api.post("/auth/register", d)
export const changePassword= (d)         => api.post("/auth/change-password", d)
export const getPublicKey  = ()          => api.get("/auth/public-key")
export const getUsers      = ()          => api.get("/auth/admin/users")
export const updateRole    = (id, role)  => api.put("/auth/admin/users/" + id + "/role", { role })
export const revokeSessions= (id)        => api.post("/auth/admin/users/" + id + "/revoke")
export default api
