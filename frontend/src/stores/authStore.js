import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('callpilot_user') || 'null'),
  token: localStorage.getItem('callpilot_token') || null,

  setUser: (user, token) => {
    localStorage.setItem('callpilot_user', JSON.stringify(user))
    if (token) localStorage.setItem('callpilot_token', token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('callpilot_user')
    localStorage.removeItem('callpilot_token')
    set({ user: null, token: null })
  },
}))
