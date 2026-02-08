import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // User state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user, token) => set({
        user,
        token,
        isAuthenticated: !!user,
        error: null
      }),

      login: async (googleCode) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('http://localhost:8000/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: googleCode })
          })
          
          if (!response.ok) {
            throw new Error('Authentication failed')
          }
          
          const data = await response.json()
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false
          })
          return data
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          const token = get().token
          if (token) {
            await fetch('http://localhost:8000/api/auth/logout', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            })
          }
        } catch (e) {
          // Ignore logout errors
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
      },

      // Fetch current user profile
      fetchUser: async () => {
        const token = get().token
        if (!token) return null
        
        try {
          const response = await fetch('http://localhost:8000/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (!response.ok) {
            throw new Error('Session expired')
          }
          
          const user = await response.json()
          set({ user, isAuthenticated: true })
          return user
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false })
          return null
        }
      }
    }),
    {
      name: 'callpilot-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
)
