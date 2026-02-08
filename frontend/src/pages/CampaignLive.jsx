import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { XCircle, Phone, CheckCircle, AlertCircle, Clock, MapPin, Star, Loader2 } from 'lucide-react'
import { useCampaignStore } from '../stores/campaignStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { api } from '../services/api'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

const STATUS_CONFIG = {
    queued: { color: 'bg-slate-100 text-slate-500', icon: Clock, label: 'Queued' },
    ringing: { color: 'bg-amber-50 text-amber-600', icon: Phone, label: 'Calling...', pulse: true },
    connected: { color: 'bg-blue-50 text-blue-600', icon: Phone, label: 'Connected' },
    negotiating: { color: 'bg-purple-50 text-purple-600', icon: Loader2, label: 'Negotiating...', spin: true },
    booked: { color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle, label: 'Booked ✓' },
    no_availability: { color: 'bg-red-50 text-red-500', icon: AlertCircle, label: 'No Availability' },
    failed: { color: 'bg-red-50 text-red-500', icon: XCircle, label: 'Failed' },
    skipped: { color: 'bg-slate-50 text-slate-400', icon: AlertCircle, label: 'Skipped' },
    completed: { color: 'bg-slate-100 text-slate-500', icon: CheckCircle, label: 'Completed' },
}

function CallCard({ providerId, call }) {
    const cfg = STATUS_CONFIG[call.status] || STATUS_CONFIG.queued
    const Icon = cfg.icon

    return (
        <div className={`rounded-xl border p-4 transition-all ${call.status === 'booked' ? 'border-emerald-300 shadow-md shadow-emerald-100' : 'border-slate-200'
            }`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    {call.photo ? (
                        <img src={call.photo} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-sky-500" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-slate-800">{call.name || 'Provider'}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                            {call.rating > 0 && <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{call.rating}</span>}
                            {call.distance < 999 && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{call.distance}mi</span>}
                        </div>
                    </div>
                </div>

                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                    <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''} ${cfg.pulse ? 'animate-pulse' : ''}`} />
                    {cfg.label}
                </span>
            </div>

            {call.status === 'booked' && call.slot && (
                <div className="bg-emerald-50 rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium text-emerald-700">
                        📅 {call.slot.date} at {call.slot.time}
                    </p>
                    {call.serviceType && <p className="text-xs text-emerald-600 mt-0.5">{call.serviceType}</p>}
                </div>
            )}

            {call.status === 'no_availability' && call.reason && (
                <p className="text-xs text-red-400 mt-1">{call.reason}</p>
            )}

            {call.status === 'failed' && call.error && (
                <p className="text-xs text-red-400 mt-1">{call.error}</p>
            )}

            {call.score && (
                <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Match Score</span>
                        <span className="font-medium text-slate-600">{Math.round(call.score * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full">
                        <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${call.score * 100}%` }} />
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CampaignLive() {
    const { groupId } = useParams()
    const navigate = useNavigate()
    const { status, message, calls, origin, campaigns, reset, handleWsMessage, setGroupId } = useCampaignStore()

    useEffect(() => {
        reset()
        setGroupId(groupId)
    }, [groupId])

    useWebSocket(groupId, handleWsMessage)

    const callList = Object.entries(calls)
    const total = callList.length
    const done = callList.filter(([, c]) => ['booked', 'no_availability', 'failed', 'skipped', 'completed'].includes(c.status)).length
    const booked = callList.filter(([, c]) => c.status === 'booked')

    const handleCancel = async () => {
        await api.cancelCampaign(groupId)
        navigate('/dashboard')
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Live Campaign</h1>
                    <p className="text-slate-400 mt-1">
                        {status === 'completed' ? 'All calls complete!' : message || 'Finding the best appointment for you...'}
                    </p>
                </div>
                {status !== 'completed' && (
                    <button onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition text-sm">
                        <XCircle className="w-4 h-4" /> Cancel
                    </button>
                )}
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                    <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-sky-500" />
                        {status === 'searching' ? 'Searching...' : status === 'calling' ? 'Calling providers...' : 'Complete'}
                    </span>
                    <span>{done} of {total} complete</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }} />
                </div>
            </div>

            {/* Main content: cards + map */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Call cards — left 3 cols */}
                <div className="lg:col-span-3 space-y-3">
                    <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Call Activity</h2>

                    {callList.length === 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
                            <p className="text-slate-400">Searching for providers...</p>
                        </div>
                    )}

                    {/* Booked calls first, then active, then rest */}
                    {[...callList]
                        .sort(([, a], [, b]) => {
                            const order = { booked: 0, ringing: 1, connected: 1, negotiating: 1, queued: 2, no_availability: 3, failed: 4, skipped: 5 }
                            return (order[a.status] ?? 9) - (order[b.status] ?? 9)
                        })
                        .map(([pid, call]) => (
                            <CallCard key={pid} providerId={pid} call={call} />
                        ))}
                </div>

                {/* Map + results — right 2 cols */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Map placeholder — use Google Maps iframe */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="h-64 bg-slate-100">
                            {origin ? (
                                <iframe
                                    width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                                    src={`https://www.google.com/maps/embed/v1/search?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${Object.values(campaigns)[0]?.providers?.[0]
                                            ? `${callList.map(([, c]) => c.name).join('|')}+near+${origin.lat},${origin.lng}`
                                            : `appointment+near+${origin.lat},${origin.lng}`
                                        }&center=${origin.lat},${origin.lng}&zoom=12`}
                                    allowFullScreen loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                                    Map loading...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results summary */}
                    {booked.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Best Matches</h3>
                            {booked.map(([pid, call]) => (
                                <div key={pid} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg mb-2">
                                    <div>
                                        <p className="font-medium text-slate-800 text-sm">{call.name}</p>
                                        <p className="text-xs text-emerald-600">{call.slot?.date} at {call.slot?.time}</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/confirmed/${groupId}`)}
                                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 transition"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {status === 'completed' && booked.length === 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                            <p className="text-slate-600 font-medium">No bookings found</p>
                            <p className="text-sm text-slate-400 mt-1">Try expanding your search radius or date range</p>
                            <button onClick={() => navigate('/book')}
                                className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 transition">
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}