import { configureStore, createSlice } from "@reduxjs/toolkit"
const KEY = "auth_token"
const authSlice = createSlice({
  name: "auth",
  initialState: { token: localStorage.getItem(KEY) || null, user: JSON.parse(localStorage.getItem(KEY + "_user") || "null") },
  reducers: {
    setCredentials(state, { payload }) { state.token = payload.token; state.user = payload.user; localStorage.setItem(KEY, payload.token); localStorage.setItem(KEY + "_user", JSON.stringify(payload.user)) },
    logout(state) { state.token = null; state.user = null; localStorage.removeItem(KEY); localStorage.removeItem(KEY + "_user") },
  },
})
export const authActions = authSlice.actions
export const store = configureStore({ reducer: { auth: authSlice.reducer } })
