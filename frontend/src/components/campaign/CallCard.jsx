import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, CheckCircle, XCircle, AlertCircle, Clock, Star, MapPin, ChevronDown, ChevronUp, Loader2, Wrench, MessageSquare, PhoneOff, Mic, Send } from 'lucide-react'
import { api } from '../../services/api'
import { useCampaignStore } from '../../stores/campaignStore'

const STATUS = {
    queued: { bg: 'bg-white', border: 'border-slate-200', icon: Clock, iconColor: 'text-slate-400', label: 'Queued', labelBg: 'bg-slate-100 text-slate-500' },
    ringing: { bg: 'bg-amber-50', border: 'border-amber-200', icon: Phone, iconColor: 'text-amber-500', label: 'Calling...', labelBg: 'bg-amber-100 text-amber-600', pulse: true },
    connected: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Phone, iconColor: 'text-blue-500', label: 'Connected', labelBg: 'bg-blue-100 text-blue-600' },
    negotiating: { bg: 'bg-purple-50', border: 'border-purple-200', icon: Wrench, iconColor: 'text-purple-500', label: 'Negotiating...', labelBg: 'bg-purple-100 text-purple-600', spin: true },
    booked: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: CheckCircle, iconColor: 'text-emerald-500', label: 'Booked ✓', labelBg: 'bg-emerald-100 text-emerald-700' },
    no_availability: { bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, iconColor: 'text-red-400', label: 'No Slots', labelBg: 'bg-red-100 text-red-500' },
    failed: { bg: 'bg-slate-50', border: 'border-slate-200', icon: AlertCircle, iconColor: 'text-slate-400', label: 'Failed', labelBg: 'bg-slate-100 text-slate-500' },
    skipped: { bg: 'bg-slate-50', border: 'border-slate-200', icon: AlertCircle, iconColor: 'text-slate-300', label: 'Skipped', labelBg: 'bg-slate-100 text-slate-400' },
    completed: { bg: 'bg-white', border: 'border-slate-200', icon: CheckCircle, iconColor: 'text-slate-400', label: 'Done', labelBg: 'bg-slate-100 text-slate-500' },
    disconnected: { bg: 'bg-orange-50', border: 'border-orange-200', icon: PhoneOff, label: 'Disconnected', labelBg: 'bg-orange-100 text-orange-600', iconColor: 'text-orange-500' },
}

export default function CallCard({ call, onConfirm }) {
    const [showInput, setShowInput] = useState(false)
    const [instruction, setInstruction] = useState('')
    const [isDisconnecting, setIsDisconnecting] = useState(false)
    const scrollRef = useRef(null)
    const { groupId } = useCampaignStore()

    const cfg = STATUS[call.status] || STATUS.queued
    const Icon = cfg.icon
    const isActive = ['ringing', 'connected', 'negotiating'].includes(call.status)
    const score = call.predictedScore || call.score || 0

    // Auto-scroll transcript
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [call.transcript])

    // Timer
    const [duration, setDuration] = useState(0)
    useEffect(() => {
        if (!isActive) return
        const start = Date.now()
        const int = setInterval(() => setDuration(Math.floor((Date.now() - start) / 1000)), 1000)
        return () => clearInterval(int)
    }, [isActive, call.status])

    const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    const handleSendInstruction = async () => {
        if (!instruction.trim()) return
        await api.sendCallCommand(groupId, call.providerId || call.provider_id, 'instruct', instruction)
        setInstruction('')
        setShowInput(false)
    }

    const handleDisconnect = async () => {
        if (!window.confirm("Are you sure you want to disconnect this call?")) return
        setIsDisconnecting(true)
        try {
            await api.sendCallCommand(groupId, call.providerId || call.provider_id, 'disconnect')
        } catch (e) {
            console.error(e)
            setIsDisconnecting(false)
        }
    }

    // Determine fallback ID if needed
    const pid = call.providerId || call.provider_id

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all duration-300 shadow-sm relative`}
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {call.photo ? (
                                <img src={call.photo} alt="" className="w-12 h-12 rounded-xl object-cover" />
                            ) : (
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white border border-slate-100`}>
                                    <Icon className={`w-5 h-5 ${cfg.iconColor} ${cfg.spin ? 'animate-spin' : ''} ${cfg.pulse ? 'animate-pulse' : ''}`} />
                                </div>
                            )}
                            {isActive && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white animate-pulse" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 text-sm leading-tight">{call.name || 'Provider'}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                {call.rating > 0 && (
                                    <span className="flex items-center gap-0.5 text-slate-500">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{call.rating}
                                    </span>
                                )}
                                <span>•</span>
                                <span>{call.distance}mi</span>
                                {isActive && (
                                    <>
                                        <span>•</span>
                                        <span className="font-mono text-slate-500">{fmtTime(duration)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.labelBg}`}>
                        {cfg.label}
                    </span>
                </div>

                {/* Live Score Bar */}
                {(score > 0 || call.offeredSlot) && (
                    <div className="mb-3 bg-white/50 rounded-lg p-2 border border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-600">
                                {call.offeredSlot ? 'Offer Received' : 'Predicted Match'}
                            </span>
                            <span className={`font-bold ${score > 0.8 ? 'text-emerald-600' : 'text-blue-600'}`}>
                                {Math.round(score * 100)}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${score * 100}%` }}
                                className={`h-full rounded-full ${score > 0.8 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            />
                        </div>
                        {call.isBest && (
                            <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-emerald-600" />
                                Current Best Option
                            </p>
                        )}
                        {call.offeredSlot && (
                            <p className="text-xs text-slate-700 mt-1 font-medium bg-emerald-100/50 px-2 py-1 rounded inline-block">
                                📅 {call.offeredSlot.date} @ {call.offeredSlot.time}
                            </p>
                        )}
                    </div>
                )}

                {/* Live Transcript Area */}
                <div className="bg-white rounded-xl border border-slate-100 h-32 overflow-y-auto p-2 mb-3 text-xs space-y-2 relative" ref={scrollRef}>
                    {(!call.transcript || call.transcript.length === 0) && (
                        <div className="h-full flex items-center justify-center text-slate-300 italic">
                            {isActive ? 'Listening...' : 'No transcript'}
                        </div>
                    )}
                    {call.transcript?.map((t, i) => (
                        <div key={i} className={`flex gap-2 ${t.role === 'agent' ? 'flex-row' : 'flex-row-reverse'}`}>
                            <div className={`p-2 rounded-lg max-w-[85%] ${t.role === 'agent'
                                ? 'bg-slate-50 text-slate-600 rounded-tl-none'
                                : 'bg-blue-50 text-blue-700 rounded-tr-none'
                                }`}>
                                {t.message}
                            </div>
                        </div>
                    ))}
                    {isActive && (
                        <div className="flex gap-1 items-center text-slate-300 text-[10px] animate-pulse pl-1">
                            <span>●</span><span>●</span><span>●</span>
                        </div>
                    )}
                </div>

                {/* User Controls */}
                {isActive && (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setShowInput(!showInput)}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {showInput ? 'Cancel' : 'Instruct'}
                        </button>
                        <button
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white border border-red-100 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200 transition"
                        >
                            {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneOff className="w-3.5 h-3.5" />}
                            End Call
                        </button>
                    </div>
                )}

                {/* Instruction Input */}
                <AnimatePresence>
                    {showInput && isActive && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-2"
                        >
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={instruction}
                                    onChange={(e) => setInstruction(e.target.value)}
                                    placeholder="Ex: Ask for Saturday..."
                                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendInstruction()}
                                />
                                <button
                                    onClick={handleSendInstruction}
                                    className="bg-blue-500 text-white rounded-lg p-1.5 hover:bg-blue-600"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* User Instruction Feedback */}
                {call.userInstruction && (
                    <div className="mt-2 text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded flex items-center gap-1">
                        <Mic className="w-3 h-3" /> Instruction sent: "{call.userInstruction}"
                    </div>
                )}

                {/* Confirm Button (if Booked) */}
                {call.status === 'booked' && onConfirm && (
                    <button onClick={onConfirm} className="w-full mt-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition">
                        Confirm Booking
                    </button>
                )}
            </div>
        </motion.div>
    )
}

