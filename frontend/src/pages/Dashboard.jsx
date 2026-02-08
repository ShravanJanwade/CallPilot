import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import PageContainer from '../components/layout/PageContainer'
import { Phone, Calendar, Clock, TrendingUp, ChevronRight, Plus, Sparkles, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Dashboard() {
    const { user } = useAuthStore()
    const [recentBookings, setRecentBookings] = useState([])
    const [stats, setStats] = useState({
        totalBookings: 0,
        successRate: 0,
        avgBookingTime: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const bookingsRes = await fetch('http://localhost:8000/api/tools/bookings')
            if (bookingsRes.ok) {
                const data = await bookingsRes.json()
                setRecentBookings(data.bookings || [])
                setStats({
                    totalBookings: data.total || 0,
                    successRate: data.total > 0 ? 85 : 0,
                    avgBookingTime: 45
                })
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        {
            label: 'Total Bookings',
            value: stats.totalBookings,
            icon: Calendar,
            gradient: 'from-primary to-primary-dark'
        },
        {
            label: 'Success Rate',
            value: `${stats.successRate}%`,
            icon: TrendingUp,
            gradient: 'from-emerald to-teal'
        },
        {
            label: 'Avg. Booking Time',
            value: `${stats.avgBookingTime}s`,
            icon: Clock,
            gradient: 'from-teal to-primary'
        }
    ]

    return (
        <PageContainer
            title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}!`}
            subtitle="Manage your appointments and launch new booking campaigns"
        >
            {/* Quick Action - Premium Book Now Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <Link
                    to="/book"
                    className="group relative block overflow-hidden rounded-2xl"
                >
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-teal to-emerald opacity-90" />

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>

                    {/* Content */}
                    <div className="relative p-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform duration-300">
                                    <Plus className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-2xl font-bold text-white">Book a New Appointment</h2>
                                        <Sparkles className="w-5 h-5 text-white/80" />
                                    </div>
                                    <p className="text-white/80">
                                        Let our AI find and book the perfect appointment for you
                                    </p>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-2 text-white/80 group-hover:text-white group-hover:translate-x-2 transition-all duration-300">
                                <span className="font-medium">Get Started</span>
                                <ChevronRight className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Link>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8"
            >
                {statCards.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        className="group glass-card p-6 cursor-default"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                                <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 h-1.5 rounded-full bg-gray-100">
                            <div
                                className={`h-full rounded-full bg-gradient-to-r ${stat.gradient} transition-all duration-1000`}
                                style={{ width: stat.label === 'Success Rate' ? `${stats.successRate}%` : '100%' }}
                            />
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Recent Bookings */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card overflow-hidden"
            >
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
                        <p className="text-gray-500 text-sm mt-1">Your latest appointment confirmations</p>
                    </div>
                    <Zap className="w-5 h-5 text-primary" />
                </div>

                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-14 h-14 skeleton rounded-xl" />
                                <div className="flex-1">
                                    <div className="w-1/3 h-4 skeleton mb-2" />
                                    <div className="w-1/2 h-3 skeleton" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : recentBookings.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
                            <Calendar className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings yet</h3>
                        <p className="text-gray-500 mb-6 max-w-xs mx-auto">
                            Start your first AI-powered booking campaign and let us handle the calls
                        </p>
                        <Link
                            to="/book"
                            className="btn btn-primary inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Your First Booking
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {recentBookings.slice(0, 5).map((booking, index) => (
                            <motion.div
                                key={booking.id || index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + index * 0.05 }}
                                className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
                            >
                                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                                    <Phone className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">
                                        {booking.provider_name || 'Provider'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {booking.service || 'Appointment'} • {booking.date} at {booking.time}
                                    </p>
                                </div>
                                <span className="badge badge-success">
                                    <span className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse" />
                                    Confirmed
                                </span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </PageContainer>
    )
}
