import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import PageContainer from '../components/layout/PageContainer'
import { Phone, Calendar, Clock, TrendingUp, ChevronRight, Plus } from 'lucide-react'
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
            // Fetch recent bookings
            const bookingsRes = await fetch('http://localhost:8000/api/tools/bookings')
            if (bookingsRes.ok) {
                const data = await bookingsRes.json()
                setRecentBookings(data.bookings || [])
                setStats({
                    totalBookings: data.total || 0,
                    successRate: data.total > 0 ? 85 : 0, // Placeholder
                    avgBookingTime: 45 // Placeholder in seconds
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
            color: 'bg-primary/10 text-primary'
        },
        {
            label: 'Success Rate',
            value: `${stats.successRate}%`,
            icon: TrendingUp,
            color: 'bg-success/10 text-success'
        },
        {
            label: 'Avg. Booking Time',
            value: `${stats.avgBookingTime}s`,
            icon: Clock,
            color: 'bg-teal/10 text-teal'
        }
    ]

    return (
        <PageContainer
            title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}!`}
            subtitle="Manage your appointments and launch new booking campaigns"
        >
            {/* Quick Action */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <Link
                    to="/book"
                    className="block bg-gradient-to-r from-primary to-teal p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                <Plus className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">Book a New Appointment</h2>
                                <p className="text-white/80 text-sm mt-1">
                                    Let our AI find and book the perfect appointment for you
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-8 h-8 text-white/60" />
                    </div>
                </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
            >
                {statCards.map((stat, index) => (
                    <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                                <p className="text-sm text-gray-500">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Recent Bookings */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm"
            >
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
                </div>

                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-12 h-12 skeleton rounded-lg" />
                                <div className="flex-1">
                                    <div className="w-1/3 h-4 skeleton mb-2" />
                                    <div className="w-1/2 h-3 skeleton" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : recentBookings.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 mb-4">No bookings yet</p>
                        <Link
                            to="/book"
                            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                        >
                            <Plus className="w-4 h-4" />
                            Create your first booking
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {recentBookings.slice(0, 5).map((booking, index) => (
                            <div key={booking.id || index} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                        {booking.provider_name || 'Provider'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {booking.service || 'Appointment'} • {booking.date} at {booking.time}
                                    </p>
                                </div>
                                <span className="badge badge-success">Confirmed</span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </PageContainer>
    )
}
