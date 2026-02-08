import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Phone, Calendar, Settings, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar() {
    const { user, logout } = useAuthStore()
    const location = useLocation()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navLinks = [
        { to: '/dashboard', label: 'Dashboard', icon: Calendar },
        { to: '/book', label: 'New Booking', icon: Phone },
        { to: '/settings', label: 'Settings', icon: Settings },
    ]

    const isActive = (path) => location.pathname === path

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal flex items-center justify-center">
                                <Phone className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xl font-semibold text-gray-900">CallPilot</span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map(({ to, label, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(to)
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="hidden md:flex items-center gap-3">
                                <span className="text-sm text-gray-600">{user.name}</span>
                                {user.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-sm font-medium text-primary">
                                            {user.name?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={logout}
                            className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-gray-100"
                    >
                        <div className="px-4 py-3 space-y-1">
                            {navLinks.map(({ to, label, icon: Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${isActive(to)
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            ))}
                            <button
                                onClick={() => { logout(); setMobileMenuOpen(false); }}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full"
                            >
                                <LogOut className="w-5 h-5" />
                                Sign Out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
