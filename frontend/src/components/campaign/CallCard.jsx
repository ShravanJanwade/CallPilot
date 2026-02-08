import { Phone, CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const statusConfig = {
    ringing: { color: 'text-warning', bg: 'bg-warning/10', icon: Phone, label: 'Ringing' },
    connected: { color: 'text-primary', bg: 'bg-primary/10', icon: Loader2, label: 'Connected' },
    negotiating: { color: 'text-teal', bg: 'bg-teal/10', icon: Loader2, label: 'Negotiating' },
    booked: { color: 'text-success', bg: 'bg-success/10', icon: CheckCircle, label: 'Slot Available' },
    no_availability: { color: 'text-gray-400', bg: 'bg-gray-100', icon: XCircle, label: 'No Availability' },
    failed: { color: 'text-error', bg: 'bg-error/10', icon: XCircle, label: 'Failed' }
}

export default function CallCard({ call }) {
    const [expanded, setExpanded] = useState(false)
    const config = statusConfig[call.status] || statusConfig.ringing

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const isActive = ['ringing', 'connected', 'negotiating'].includes(call.status)

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-xl border ${isActive ? 'border-primary/30 shadow-md' : 'border-gray-100'
                } overflow-hidden`}
        >
            {/* Header */}
            <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
                        <config.icon className={`w-5 h-5 ${config.color} ${isActive ? 'animate-pulse' : ''
                            }`} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{call.providerName}</p>
                        <div className="flex items-center gap-2 text-xs">
                            <span className={`${config.color} font-medium`}>{config.label}</span>
                            {call.duration > 0 && (
                                <span className="text-gray-400">• {formatDuration(call.duration)}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {call.offeredSlot && (
                        <span className="badge badge-success text-xs">
                            {new Date(call.offeredSlot.start).toLocaleString()}
                        </span>
                    )}
                    {call.transcript?.length > 0 && (
                        <button className="text-gray-400 hover:text-gray-600">
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Transcript */}
            <AnimatePresence>
                {expanded && call.transcript?.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100"
                    >
                        <div className="p-4 max-h-64 overflow-y-auto space-y-2 bg-gray-50">
                            {call.transcript.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-2 ${msg.speaker === 'agent' ? 'justify-end' : 'justify-start'
                                        }`}
                                >
                                    <div
                                        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.speaker === 'agent'
                                                ? 'bg-primary text-white'
                                                : 'bg-white border border-gray-200 text-gray-800'
                                            }`}
                                    >
                                        <p className="text-xs opacity-75 mb-1">
                                            {msg.speaker === 'agent' ? 'Agent' : 'Receptionist'}
                                        </p>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Live transcript indicator */}
            {isActive && !expanded && call.transcript?.length > 0 && (
                <div className="px-4 pb-3">
                    <p className="text-xs text-gray-500 truncate">
                        "{call.transcript[call.transcript.length - 1]?.text}"
                    </p>
                </div>
            )}
        </motion.div>
    )
}
