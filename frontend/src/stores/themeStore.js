import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
    persist(
        (set, get) => ({
            theme: 'light', // 'light' or 'dark'
            
            toggleTheme: () => {
                const newTheme = get().theme === 'light' ? 'dark' : 'light'
                set({ theme: newTheme })
                applyTheme(newTheme)
            },
            
            setTheme: (theme) => {
                set({ theme })
                applyTheme(theme)
            },
            
            initTheme: () => {
                applyTheme(get().theme)
            }
        }),
        {
            name: 'callpilot-theme-v2',
            onRehydrateStorage: () => (state) => {
                if (state) applyTheme(state.theme)
            }
        }
    )
)

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
}
