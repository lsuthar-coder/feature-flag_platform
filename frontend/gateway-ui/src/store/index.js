import { configureStore, createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('gw_token') || null,
    user:  JSON.parse(localStorage.getItem('gw_user') || 'null'),
  },
  reducers: {
    setCredentials(state, { payload }) {
      state.token = payload.token; state.user = payload.user
      localStorage.setItem('gw_token', payload.token)
      localStorage.setItem('gw_user', JSON.stringify(payload.user))
    },
    logout(state) {
      state.token = null; state.user = null
      localStorage.removeItem('gw_token'); localStorage.removeItem('gw_user')
    },
  },
})

export const authActions = authSlice.actions
export const store = configureStore({ reducer: { auth: authSlice.reducer } })
