import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, CheckCircle, Phone, Clock } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { api } from '../services/api'

export default function Dashboard() {
    const user = useAuthStore((s) => s.user)
    const [bookings, setBookings] = useState([])

    useEffect(() => {
        api.getBookings().then((d) => setBookings(d.bookings || []))
    }, [])

    return (
        <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">
                    Welcome back, {user?.name?.split(' ')[0]} 👋
                </h1>
                <p className="text-slate-500 mt-1">What would you like to book today?</p>
            </div>

            <Link
                to="/book"
                className="block bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl p-8 text-white mb-10 hover:shadow-lg transition group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
                        <CalendarPlus className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Book a New Appointment</h2>
                        <p className="text-sky-100 mt-1">Let CallPilot find and book the best slot for you</p>
                    </div>
                </div>
            </Link>

            <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                    { icon: CheckCircle, label: 'Total Bookings', value: bookings.length, color: 'text-emerald-500' },
                    { icon: Phone, label: 'Calls Made', value: bookings.length * 3, color: 'text-sky-500' },
                    { icon: Clock, label: 'Time Saved', value: `${bookings.length * 25}min`, color: 'text-amber-500' },
                ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-white rounded-xl p-5 border border-slate-100">
                        <Icon className={`w-5 h-5 ${color} mb-2`} />
                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                        <p className="text-sm text-slate-400">{label}</p>
                    </div>
                ))}
            </div>

            <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Bookings</h2>
            {bookings.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center border border-slate-100">
                    <p className="text-slate-400">No bookings yet. Start by booking your first appointment!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bookings.map((b) => (
                        <div key={b.id} className="bg-white rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800">{b.service} at {b.provider_name}</p>
                                <p className="text-sm text-slate-400">{b.date} at {b.time}</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                                Confirmed
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}