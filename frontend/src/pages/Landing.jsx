import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Phone, Calendar, Clock, CheckCircle, Sparkles, Zap, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

// Google OAuth config
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const REDIRECT_URI = window.location.origin + '/auth/callback'

export default function Landing() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { login, isLoading, error, isAuthenticated } = useAuthStore()

    useEffect(() => {
        const code = searchParams.get('code')
        if (code) {
            handleGoogleCallback(code)
        }
    }, [searchParams])

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
            description: 'Our AI agent calls providers with natural, human-like conversation',
            color: 'from-primary to-primary-light'
        },
        {
            icon: Calendar,
            title: 'Calendar Sync',
            description: 'Automatically syncs with Google Calendar to avoid conflicts',
            color: 'from-teal to-teal-light'
        },
        {
            icon: Zap,
            title: 'Lightning Fast',
            description: 'Book appointments in seconds, not hours of phone calls',
            color: 'from-emerald to-emerald-light'
        },
        {
            icon: Shield,
            title: 'Secure & Private',
            description: 'Your data stays protected with enterprise-grade security',
            color: 'from-primary to-teal'
        }
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-off-white">
            {/* Subtle Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal/5 to-transparent rounded-full blur-3xl" />
            </div>

            {/* Main Content */}
            <div className="relative z-10">
                {/* Hero Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
                    <div className="text-center">
                        {/* Logo */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="flex justify-center mb-10"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-teal to-emerald flex items-center justify-center shadow-lg glow-primary">
                                        <Phone className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <span className="text-5xl font-bold text-gray-900">
                                    Call<span className="gradient-text">Pilot</span>
                                </span>
                            </div>
                        </motion.div>

                        {/* Premium Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
                        >
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-primary">Powered by ElevenLabs AI</span>
                        </motion.div>

                        {/* Main Headline */}
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight"
                        >
                            Book Appointments
                            <span className="block gradient-text-animate mt-2">Without Lifting a Finger</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed"
                        >
                            Our AI assistant calls healthcare providers, negotiates appointment times,
                            and books slots that work with your schedule — <span className="text-gray-900 font-medium">all automatically</span>.
                        </motion.p>

                        {/* CTA Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-col items-center"
                        >
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="group relative inline-flex items-center gap-4 px-8 py-4 bg-white rounded-2xl text-gray-900 font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 border border-gray-200"
                            >
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-teal to-emerald opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                                <div className="relative flex items-center gap-4">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>{isLoading ? 'Signing in...' : 'Get Started with Google'}</span>
                                </div>
                            </button>

                            {error && (
                                <p className="mt-4 text-red-500 text-sm">{error}</p>
                            )}

                            <p className="mt-6 text-sm text-gray-500 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                Syncs with your Google Calendar automatically
                            </p>
                        </motion.div>
                    </div>

                    {/* Features Grid */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24"
                    >
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                variants={itemVariants}
                                className="group glass-card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-2">{feature.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* How It Works Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-32 text-center"
                    >
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
                        <p className="text-gray-600 mb-12 max-w-xl mx-auto">Three simple steps to hands-free appointment booking</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                            {[
                                { step: '01', title: 'Tell Us What You Need', desc: 'Select service type, location, and preferred times' },
                                { step: '02', title: 'AI Makes the Calls', desc: 'Our agent contacts providers and negotiates on your behalf' },
                                { step: '03', title: 'Get Booked', desc: 'Appointment confirmed and synced to your calendar' }
                            ].map((item, i) => (
                                <div key={item.step} className="relative">
                                    <div className="text-6xl font-bold gradient-text opacity-50 mb-4">{item.step}</div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-gray-500 text-sm">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <footer className="border-t border-gray-200 py-8 bg-white/50 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal flex items-center justify-center">
                                <Phone className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-gray-900">CallPilot</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Powered by ElevenLabs Conversational AI + Google Calendar
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            Built for ElevenLabs Hackathon 2024
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    )
}
