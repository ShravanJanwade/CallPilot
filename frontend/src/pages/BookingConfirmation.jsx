import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Calendar, Clock, MapPin, ArrowDown, Sparkles } from 'lucide-react'
import { api } from '../services/api'
import ProviderMap from '../components/campaign/ProviderMap'

export default function BookingConfirmation() {
    const { groupId } = useParams()
    const [opt, setOpt] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.optimizeCampaign(groupId)
            .then(setOpt).catch(console.error)
            .finally(() => setLoading(false))
    }, [groupId])

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Optimizing your schedule...</p>
                </div>
            </div>
        )
    }

    const apts = opt?.appointments || []
    const EMOJIS = { dentist: '🦷', barber: '✂️', doctor: '🩺', mechanic: '🔧', salon: '💇', vet: '🐾' }

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">
            {/* Success header */}
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }} className="text-center mb-10">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-100">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                    {apts.length > 1 ? 'Your Week is Booked!' : 'Appointment Confirmed!'}
                </h1>
                <p className="text-slate-400">
                    {apts.length > 1
                        ? `${apts.length} appointments optimized — zero conflicts, minimal travel`
                        : 'Everything is set. Added to your Google Calendar.'}
                </p>
            </motion.div>

            {/* Stats */}
            {opt?.optimized && apts.length > 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { v: apts.length, l: 'Appointments', color: 'text-sky-500' },
                        { v: `${opt.total_travel_miles || 0}mi`, l: 'Total Travel', color: 'text-emerald-500' },
                        { v: opt.conflicts_resolved || 0, l: 'Conflicts Avoided', color: 'text-purple-500' },
                    ].map(({ v, l, color }) => (
                        <div key={l} className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
                            <p className={`text-2xl font-bold ${color}`}>{v}</p>
                            <p className="text-xs text-slate-400">{l}</p>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Appointment timeline */}
            <div className="space-y-3 mb-8">
                {apts.map((apt, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}>
                        {/* Connector */}
                        {i > 0 && (
                            <div className="flex items-center justify-center py-1">
                                <ArrowDown className="w-4 h-4 text-sky-300" />
                            </div>
                        )}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                                        {EMOJIS[apt.service_type] || '📅'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{apt.provider_name}</p>
                                        <p className="text-sm text-slate-500 capitalize">{apt.service_type}</p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{apt.slot?.date}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{apt.slot?.time}</span>
                                            {apt.distance_miles > 0 && (
                                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{apt.distance_miles}mi</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full border border-emerald-100">
                                    Confirmed ✓
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Map with all appointments */}
            {apts.length > 0 && apts[0].lat && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
                    <ProviderMap
                        providers={apts.map((a, i) => ({
                            provider_id: `apt_${i}`, name: a.provider_name,
                            lat: a.lat, lng: a.lng, status: 'booked', slot: a.slot, rating: 0,
                        }))}
                        origin={apts[0] ? { lat: apts[0].lat, lng: apts[0].lng } : undefined}
                        radiusMiles={15}
                        height="280px"
                    />
                </motion.div>
            )}

            {/* Calendar confirmation */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 mb-8 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-700">
                    All appointments have been added to your Google Calendar automatically.
                </p>
            </motion.div>

            {/* Actions */}
            <div className="flex gap-3">
                <Link to="/dashboard"
                    className="flex-1 py-3.5 bg-sky-500 text-white rounded-xl font-medium text-center hover:bg-sky-600 transition">
                    Back to Dashboard
                </Link>
                <Link to="/book"
                    className="flex-1 py-3.5 border border-slate-200 text-slate-600 rounded-xl font-medium text-center hover:bg-slate-50 transition">
                    Book Another
                </Link>
            </div>
        </div>
    )
}