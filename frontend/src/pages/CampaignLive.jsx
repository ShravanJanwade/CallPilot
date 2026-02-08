import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { XCircle, Phone, Loader2, Trophy } from 'lucide-react'
import { useCampaignStore } from '../stores/campaignStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { api } from '../services/api'
import CallCard from '../components/campaign/CallCard'
import ProviderMap from '../components/campaign/ProviderMap'

export default function CampaignLive() {
    const { groupId } = useParams()
    const nav = useNavigate()
    const store = useCampaignStore()
    const { status, message, calls, origin, campaigns, reset, handleWsMessage, setGroupId } = store

    useEffect(() => { reset(); setGroupId(groupId) }, [groupId])
    useWebSocket(groupId, handleWsMessage)

    const callList = Object.entries(calls)
    const total = callList.length
    const done = callList.filter(([, c]) => ['booked', 'no_availability', 'failed', 'skipped', 'completed'].includes(c.status)).length
    const booked = callList.filter(([, c]) => c.status === 'booked')
    const active = callList.filter(([, c]) => ['ringing', 'connected', 'negotiating'].includes(c.status))
    const pct = total > 0 ? (done / total) * 100 : 0

    // Build map providers with status
    const mapProviders = callList.map(([pid, c]) => ({
        provider_id: pid, name: c.name, lat: c.lat, lng: c.lng,
        rating: c.rating, distance_miles: c.distance, photo_url: c.photo,
        phone: '', status: c.status, slot: c.slot,
    })).filter(p => p.lat && p.lng)

    const handleConfirm = (pid) => nav(`/confirmed/${groupId}`)

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {status === 'completed' ? '🎉 All calls complete!' : 'Live Campaign'}
                    </h1>
                    <p className="text-slate-400 mt-1">{message || 'Finding the best appointment for you...'}</p>
                </motion.div>
                {status !== 'completed' && (
                    <button onClick={() => { api.cancelCampaign(groupId); nav('/dashboard') }}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition text-sm">
                        <XCircle className="w-4 h-4" /> Cancel
                    </button>
                )}
            </div>

            {/* Progress */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === 'completed' ? 'bg-emerald-100' : status === 'calling' ? 'bg-sky-100' : 'bg-slate-100'
                            }`}>
                            {status === 'completed' ? <Trophy className="w-4 h-4 text-emerald-500" /> :
                                status === 'calling' ? <Phone className="w-4 h-4 text-sky-500 animate-pulse" /> :
                                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">
                                {status === 'searching' ? 'Searching for providers...' :
                                    status === 'calling' ? `${active.length} active call${active.length !== 1 ? 's' : ''}` :
                                        status === 'completed' ? `${booked.length} booking${booked.length !== 1 ? 's' : ''} found` : 'Starting...'}
                            </p>
                            <p className="text-xs text-slate-400">{done} of {total} complete</p>
                        </div>
                    </div>
                    {import.meta.env.VITE_SPAM_PREVENT === 'on' && (
                        <span className="text-xs text-amber-500 bg-amber-50 px-2.5 py-1 rounded-full">🛡️ Safe mode</span>
                    )}
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${booked.length > 0 ? 'bg-gradient-to-r from-sky-400 to-emerald-400' : 'bg-sky-400'}`} />
                </div>
            </motion.div>

            {/* Main: Cards + Map */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Call cards */}
                <div className="lg:col-span-3 space-y-3">
                    {callList.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
                            <Loader2 className="w-10 h-10 text-sky-300 animate-spin mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Searching for providers...</p>
                            <p className="text-xs text-slate-400 mt-1">This usually takes a few seconds</p>
                        </motion.div>
                    )}

                    {/* Sort: booked first, then active, then rest */}
                    {[...callList]
                        .sort(([, a], [, b]) => {
                            const o = { booked: 0, ringing: 1, connected: 1, negotiating: 1, queued: 2, no_availability: 3, completed: 4, failed: 5, skipped: 6 }
                            return (o[a.status] ?? 9) - (o[b.status] ?? 9)
                        })
                        .map(([pid, call]) => (
                            <CallCard key={pid} call={call}
                                onConfirm={call.status === 'booked' ? () => handleConfirm(pid) : null} />
                        ))
                    }
                </div>

                {/* Right: Map + Results */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Map */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="h-72">
                            {origin || mapProviders.length > 0 ? (
                                <ProviderMap
                                    providers={mapProviders}
                                    origin={origin || { lat: 42.36, lng: -71.06 }}
                                    radiusMiles={10}
                                    height="100%"
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-sm text-slate-400">
                                    Map loading...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Best matches */}
                    {booked.length > 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5 text-amber-500" /> Best Matches
                            </h3>
                            {booked.map(([pid, call]) => (
                                <div key={pid} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl mb-2 border border-emerald-100">
                                    <div>
                                        <p className="font-medium text-slate-800 text-sm">{call.name}</p>
                                        <p className="text-xs text-emerald-600">📅 {call.slot?.date} at {call.slot?.time}</p>
                                        {call.score && <p className="text-xs text-slate-400 mt-0.5">Score: {Math.round(call.score * 100)}%</p>}
                                    </div>
                                    <button onClick={() => handleConfirm(pid)}
                                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition">
                                        Confirm
                                    </button>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* No results */}
                    {status === 'completed' && booked.length === 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                            <XCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">No bookings found</p>
                            <p className="text-sm text-slate-400 mt-1">Try expanding your search or date range</p>
                            <button onClick={() => nav('/book')}
                                className="mt-4 px-5 py-2 bg-sky-500 text-white rounded-xl text-sm hover:bg-sky-600 transition">
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}