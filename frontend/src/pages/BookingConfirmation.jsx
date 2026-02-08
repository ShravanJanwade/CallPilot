import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Calendar, MapPin, Clock, ArrowRight, PartyPopper } from 'lucide-react'
import { api } from '../services/api'

export default function BookingConfirmation() {
    const { groupId } = useParams()
    const [searchParams] = useSearchParams()
    const [optimization, setOptimization] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const opt = await api.optimizeCampaign(groupId)
                setOptimization(opt)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
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

    const appointments = optimization?.appointments || []

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">
            {/* Success header */}
            <div className="text-center mb-10">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                    {appointments.length > 1 ? 'Your Week is Booked!' : 'Appointment Confirmed!'}
                </h1>
                <p className="text-slate-400">
                    {appointments.length > 1
                        ? `${appointments.length} appointments optimized for minimal travel and zero conflicts`
                        : 'Added to your Google Calendar'
                    }
                </p>
            </div>

            {/* Optimization stats */}
            {optimization?.optimized && appointments.length > 1 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                        <p className="text-2xl font-bold text-sky-500">{appointments.length}</p>
                        <p className="text-xs text-slate-400">Appointments</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-500">{optimization.total_travel_miles}mi</p>
                        <p className="text-xs text-slate-400">Total Travel</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                        <p className="text-2xl font-bold text-purple-500">{optimization.conflicts_resolved}</p>
                        <p className="text-xs text-slate-400">Conflicts Avoided</p>
                    </div>
                </div>
            )}

            {/* Appointment cards — timeline style */}
            <div className="space-y-4 mb-8">
                {appointments.map((apt, i) => (
                    <div key={i} className="relative">
                        {/* Timeline connector */}
                        {i < appointments.length - 1 && (
                            <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-sky-200 -mb-4 z-0" />
                        )}

                        <div className="bg-white rounded-xl border border-slate-200 p-5 relative z-10">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg">{
                                            apt.service_type === 'dentist' ? '🦷' :
                                                apt.service_type === 'barber' ? '✂️' :
                                                    apt.service_type === 'doctor' ? '🩺' :
                                                        apt.service_type === 'mechanic' ? '🔧' :
                                                            apt.service_type === 'salon' ? '💇' : '📅'
                                        }</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{apt.provider_name}</p>
                                        <p className="text-sm text-slate-500 capitalize">{apt.service_type}</p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {apt.slot?.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {apt.slot?.time}
                                            </span>
                                            {apt.distance_miles > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {apt.distance_miles}mi
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">
                                    Confirmed ✓
                                </span>
                            </div>

                            {/* Travel to next appointment */}
                            {i < appointments.length - 1 && appointments[i + 1].lat && apt.lat && (
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                                    <ArrowRight className="w-3 h-3" />
                                    <span>Next: {appointments[i + 1].provider_name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Map showing route */}
            {appointments.length > 0 && appointments[0].lat && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
                    <iframe
                        width="100%" height="300" frameBorder="0" style={{ border: 0 }}
                        src={`https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&origin=${appointments[0].lat},${appointments[0].lng}&destination=${appointments[appointments.length - 1].lat},${appointments[appointments.length - 1].lng}${appointments.length > 2
                                ? `&waypoints=${appointments.slice(1, -1).map(a => `${a.lat},${a.lng}`).join('|')}`
                                : ''
                            }&mode=driving`}
                        allowFullScreen loading="lazy"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <Link to="/dashboard"
                    className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-medium text-center hover:bg-sky-600 transition">
                    Back to Dashboard
                </Link>
                <Link to="/book"
                    className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium text-center hover:bg-slate-50 transition">
                    Book Another
                </Link>
            </div>
        </div>
    )
}