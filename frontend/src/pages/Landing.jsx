import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Phone, Calendar, Clock, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

// Google OAuth config - replace with your actual client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const REDIRECT_URI = window.location.origin + '/auth/callback'

export default function Landing() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { login, isLoading, error, isAuthenticated } = useAuthStore()

    // Handle OAuth callback
    useEffect(() => {
        const code = searchParams.get('code')
        if (code) {
            handleGoogleCallback(code)
        }
    }, [searchParams])

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard')
        }
    }, [isAuthenticated, navigate])

    const handleGoogleCallback = async (code) => {
        try {
            await login(code)
            navigate('/dashboard')
        } catch (err) {
            console.error('Login failed:', err)
        }
    }

    const handleGoogleSignIn = () => {
        const scope = encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar')
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`
        window.location.href = authUrl
    }

    const features = [
        {
            icon: Phone,
            title: 'AI Voice Calling',
            description: 'Our AI agent calls providers on your behalf with natural conversation'
        },
        {
            icon: Calendar,
            title: 'Calendar Sync',
            description: 'Automatically checks your Google Calendar to avoid conflicts'
        },
        {
            icon: Clock,
            title: 'Smart Scheduling',
            description: 'Find the best appointments based on your priorities'
        },
        {
            icon: CheckCircle,
            title: 'Instant Booking',
            description: 'Appointments are booked and synced to your calendar automatically'
        }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
            {/* Hero Section */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
                <div className="text-center">
                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center mb-8"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-teal flex items-center justify-center shadow-lg">
                                <Phone className="w-7 h-7 text-white" />
                            </div>
                            <span className="text-4xl font-bold text-gray-900">CallPilot</span>
                        </div>
                    </motion.div>

                    {/* Tagline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
                    >
                        Book Appointments
                        <span className="block text-primary mt-2">Without Lifting a Finger</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-600 max-w-2xl mx-auto mb-10"
                    >
                        Our AI assistant calls healthcare providers, negotiates appointment times,
                        and books slots that work with your schedule — all automatically.
                    </motion.p>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium text-lg hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all disabled:opacity-50"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {isLoading ? 'Signing in...' : 'Sign in with Google'}
                        </button>

                        {error && (
                            <p className="mt-4 text-red-500 text-sm">{error}</p>
                        )}

                        <p className="mt-4 text-sm text-gray-500">
                            We'll sync with your Google Calendar to find the perfect time
                        </p>
                    </motion.div>
                </div>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                <feature.icon className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                            <p className="text-sm text-gray-600">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Footer */}
            <footer className="border-t border-gray-200 py-8">
                <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
                    <p>Powered by ElevenLabs Conversational AI + Google Calendar</p>
                </div>
            </footer>
        </div>
    )
}
