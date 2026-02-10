import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { XCircle, Phone, Loader2, Trophy, Clock, CheckCircle, ArrowRight, User } from 'lucide-react'
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

    const callList = Object.entries(calls).map(([pid, c]) => ({ ...c, providerId: pid }))
    const total = callList.length
    const done = callList.filter(c => ['booked', 'no_availability', 'failed', 'skipped', 'completed', 'disconnected'].includes(c.status)).length
    const booked = callList.filter(c => c.status === 'booked').sort((a, b) => (b.score || 0) - (a.score || 0))
    const active = callList.filter(c => ['ringing', 'connected', 'negotiating'].includes(c.status))
    const negotiations = callList.filter(c => c.status === 'negotiating' || c.offeredSlot)
    const pct = total > 0 ? (done / total) * 100 : 0

    // Build map providers
    const mapProviders = callList.map(c => ({
        provider_id: c.providerId, name: c.name, lat: c.lat, lng: c.lng,
        rating: c.rating, distance_miles: c.distance, photo_url: c.photo,
        phone: '', status: c.status, slot: c.slot,
    })).filter(p => p.lat && p.lng)

    const handleConfirm = (pid) => nav(`/confirmed/${groupId}`)

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 h-screen flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => nav('/dashboard')} className="text-sm text-slate-500 hover:text-slate-800 font-medium">
                        ← Dashboard
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {status === 'completed' ? '🎉 Campaign Complete' : 'Live Campaign'}
                            {status === 'calling' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                        </h1>
                        <p className="text-xs text-slate-500">{message || 'Orchestrating calls...'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <div className="text-xs font-semibold text-slate-600 mb-1">
                            {done} / {total} calls completed
                        </div>
                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div animate={{ width: `${pct}%` }} className="h-full bg-slate-800 rounded-full" />
                        </div>
                    </div>

                    {status !== 'completed' && (
                        <button onClick={() => { api.cancelCampaign(groupId); nav('/dashboard') }}
                            className="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition border border-red-100">
                            Cancel All
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">

                {/* LEFT COLUMN: Call Cards (Scrollable) */}
                <div className="lg:col-span-7 flex flex-col min-h-0 space-y-4 overflow-y-auto pr-2 pb-4">
                    {callList.length === 0 && (
                        <div className="py-20 text-center">
                            <Loader2 className="w-8 h-8 text-slate-300 animate-spin mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">Initializing agents...</p>
                        </div>
                    )}

                    {/* Sort: Active first, then booked, then others */}
                    {[...callList]
                        .sort((a, b) => {
                            const o = { ringing: 0, connected: 0, negotiating: 0, booked: 1, queued: 2, no_availability: 3, completed: 4, failed: 5, skipped: 6, disconnected: 7 }
                            return (o[a.status] ?? 9) - (o[b.status] ?? 9)
                        })
                        .map(c => (
                            <CallCard key={c.providerId} call={c}
                                onConfirm={c.status === 'booked' ? () => handleConfirm(c.providerId) : null} />
                        ))
                    }
                </div>

                {/* RIGHT COLUMN: Map & Scoreboard */}
                <div className="lg:col-span-5 flex flex-col gap-4 min-h-0 overflow-y-auto pb-4">

                    {/* 1. Map */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-64 shrink-0">
                        <ProviderMap
                            providers={mapProviders}
                            origin={origin || { lat: 42.36, lng: -71.06 }}
                            radiusMiles={10}
                            height="100%"
                        />
                    </div>

                    {/* 2. Live Scoreboard */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm shrink-0">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Trophy className="w-3 h-3 text-amber-500" /> Live Scoreboard
                        </h3>
                        <div className="space-y-3">
                            {booked.length === 0 && negotiations.length === 0 && (
                                <p className="text-xs text-slate-400 italic text-center py-2">Waiting for offers...</p>
                            )}

                            {/* Best Matches / Negotiating */}
                            {[...booked, ...negotiations]
                                .filter((v, i, a) => a.findIndex(t => (t.providerId === v.providerId)) === i) // dedup
                                .sort((a, b) => (b.predictedScore || b.score || 0) - (a.predictedScore || a.score || 0))
                                .map((c, i) => (
                                    <div key={c.providerId} className="flex items-center gap-3">
                                        <div className="text-[10px] font-mono text-slate-300 w-3">{i + 1}</div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center text-xs mb-1">
                                                <span className={`font-medium ${i === 0 ? 'text-slate-800' : 'text-slate-500'}`}>{c.name}</span>
                                                <span className="font-bold text-slate-700">{Math.round((c.predictedScore || c.score || 0) * 100)}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(c.predictedScore || c.score || 0) * 100}%` }}
                                                    className={`h-full rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-slate-300'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* 3. Results / Action Panel */}
                    {(status === 'completed' || booked.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-200/50"
                        >
                            {booked.length > 0 ? (
                                <>
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-white">Top Result Found</h3>
                                            <p className="text-slate-400 text-xs">Based on your preferences</p>
                                        </div>
                                        <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                                            {Math.round((booked[0].score || 0) * 100)}% MATCH
                                        </div>
                                    </div>

                                    <div className="bg-white/10 rounded-xl p-3 mb-4 backdrop-blur-sm border border-white/10">
                                        <p className="font-semibold text-sm">{booked[0].name}</p>
                                        <p className="text-emerald-400 text-sm font-medium mt-1 mb-1">
                                            📅 {booked[0].slot?.date} at {booked[0].slot?.time}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-slate-300">
                                                ⭐ {booked[0].rating}
                                            </span>
                                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-slate-300">
                                                📍 {booked[0].distance}mi
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleConfirm(booked[0].providerId)}
                                        className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-50 transition flex items-center justify-center gap-2"
                                    >
                                        Confirm & Finish <ArrowRight className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <XCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                    <p className="text-slate-400 font-medium text-sm">No bookings secured</p>
                                    <button onClick={() => nav('/dashboard')} className="mt-4 text-xs text-white underline">
                                        Return to Dashboard
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                </div>
            </div>
        </div>
    )
}
