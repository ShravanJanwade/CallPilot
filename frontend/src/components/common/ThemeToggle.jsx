import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import { motion, AnimatePresence } from 'framer-motion'

export default function ThemeToggle() {
    const { theme, toggleTheme } = useThemeStore()
    const isDark = theme === 'dark'

    return (
        <button
            onClick={toggleTheme}
            className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-all duration-300 group"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <AnimatePresence mode="wait">
                {isDark ? (
                    <motion.div
                        key="moon"
                        initial={{ opacity: 0, rotate: -90, scale: 0 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Moon className="w-5 h-5 text-primary" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="sun"
                        initial={{ opacity: 0, rotate: 90, scale: 0 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: -90, scale: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Sun className="w-5 h-5 text-amber-500" />
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    )
}
