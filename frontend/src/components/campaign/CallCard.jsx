import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, CheckCircle, XCircle, AlertCircle, Clock, Star, MapPin, ChevronDown, ChevronUp, Loader2, Wrench } from 'lucide-react'
import TranscriptView from './TranscriptView'

const STATUS = {
    queued: { bg: 'bg-white', border: 'border-slate-200', icon: Clock, iconColor: 'text-slate-400', label: 'Queued', labelBg: 'bg-slate-100 text-slate-500' },
    ringing: { bg: 'bg-amber-50/30', border: 'border-amber-200', icon: Phone, iconColor: 'text-amber-500', label: 'Calling...', labelBg: 'bg-amber-100 text-amber-600', pulse: true },
    connected: { bg: 'bg-blue-50/30', border: 'border-blue-200', icon: Phone, iconColor: 'text-blue-500', label: 'Connected', labelBg: 'bg-blue-100 text-blue-600' },
    negotiating: { bg: 'bg-purple-50/30', border: 'border-purple-200', icon: Wrench, iconColor: 'text-purple-500', label: 'Negotiating...', labelBg: 'bg-purple-100 text-purple-600', spin: true },
    booked: { bg: 'bg-emerald-50/40', border: 'border-emerald-300', icon: CheckCircle, iconColor: 'text-emerald-500', label: 'Booked ✓', labelBg: 'bg-emerald-100 text-emerald-700' },
    no_availability: { bg: 'bg-red-50/30', border: 'border-red-200', icon: XCircle, iconColor: 'text-red-400', label: 'No Slots', labelBg: 'bg-red-100 text-red-500' },
    failed: { bg: 'bg-slate-50', border: 'border-slate-200', icon: AlertCircle, iconColor: 'text-slate-400', label: 'Failed', labelBg: 'bg-slate-100 text-slate-500' },
    skipped: { bg: 'bg-slate-50', border: 'border-slate-200', icon: AlertCircle, iconColor: 'text-slate-300', label: 'Skipped', labelBg: 'bg-slate-100 text-slate-400' },
    completed: { bg: 'bg-white', border: 'border-slate-200', icon: CheckCircle, iconColor: 'text-slate-400', label: 'Done', labelBg: 'bg-slate-100 text-slate-500' },
}

export default function CallCard({ call, onConfirm }) {
    const [expanded, setExpanded] = useState(false)
    const cfg = STATUS[call.status] || STATUS.queued
    const Icon = cfg.icon
    const hasTranscript = call.transcript && call.transcript.length > 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all duration-300 ${call.status === 'booked' ? 'shadow-md shadow-emerald-100' : 'shadow-sm'
                }`}
        >
            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                        {call.photo ? (
                            <img src={call.photo} alt="" className="w-11 h-11 rounded-xl object-cover" />
                        ) : (
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100`}>
                                <Icon className={`w-5 h-5 ${cfg.iconColor} ${cfg.spin ? 'animate-spin' : ''} ${cfg.pulse ? 'animate-pulse' : ''}`} />
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-slate-800 text-sm">{call.name || 'Provider'}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                {call.rating > 0 && (
                                    <span className="flex items-center gap-0.5">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{call.rating}
                                    </span>
                                )}
                                {call.distance < 999 && (
                                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{call.distance}mi</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.labelBg}`}>
                        <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''} ${cfg.pulse ? 'animate-pulse' : ''}`} />
                        {cfg.label}
                    </span>
                </div>

                {/* Booked slot */}
                {call.status === 'booked' && call.slot && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-50 rounded-xl p-3 mb-3 border border-emerald-100"
                    >
                        <p className="text-sm font-semibold text-emerald-700">
                            📅 {call.slot.date} at {call.slot.time}
                        </p>
                        {call.serviceType && <p className="text-xs text-emerald-600 mt-0.5">{call.serviceType}</p>}
                        {onConfirm && (
                            <button onClick={onConfirm}
                                className="mt-2 w-full py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition">
                                ✓ Confirm This Booking
                            </button>
                        )}
                    </motion.div>
                )}

                {/* Score bar */}
                {call.score && call.score > 0 && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Match Score</span>
                            <span className="font-semibold text-slate-600">{Math.round(call.score * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${call.score * 100}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full"
                            />
                        </div>
                    </div>
                )}

                {/* Reason for no availability */}
                {call.status === 'no_availability' && call.reason && (
                    <p className="text-xs text-red-400 italic">"{call.reason}"</p>
                )}

                {/* Error */}
                {call.status === 'failed' && call.error && (
                    <p className="text-xs text-red-400">{call.error}</p>
                )}

                {/* Expand transcript */}
                {(hasTranscript || ['connected', 'negotiating', 'booked', 'completed'].includes(call.status)) && (
                    <button onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition mt-2"
                    >
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {hasTranscript ? `View Transcript (${call.transcript.length} messages)` : 'Waiting for transcript...'}
                    </button>
                )}
            </div>

            {/* Transcript panel */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50"
                    >
                        <TranscriptView transcript={call.transcript || []} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}