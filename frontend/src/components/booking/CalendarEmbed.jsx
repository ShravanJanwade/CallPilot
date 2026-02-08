import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../../services/api'

function getWeekDates(baseDate) {
    const d = new Date(baseDate)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d.setDate(diff))
    return Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(mon)
        dt.setDate(mon.getDate() + i)
        return dt
    })
}

function fmt(d) { return d.toISOString().split('T')[0] }
function fmtTime(h) { return h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM` }

export default function CalendarEmbed({ newBookings = [] }) {
    const [weekStart, setWeekStart] = useState(new Date())
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)

    const days = getWeekDates(weekStart)
    const hours = Array.from({ length: 13 }, (_, i) => i + 7) // 7AM - 7PM

    useEffect(() => {
        setLoading(true)
        api.getCalendarEvents(fmt(days[0]), fmt(days[6]))
            .then(d => setEvents(d.events || []))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false))
    }, [weekStart])

    const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
    const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }
    const thisWeek = () => setWeekStart(new Date())

    const getEventsForCell = (day, hour) => {
        const dayStr = fmt(day)
        return [...events, ...newBookings].filter(e => {
            const start = new Date(e.start || `${e.date}T${e.time || '00:00'}`)
            return fmt(start) === dayStr && start.getHours() === hour
        })
    }

    const today = fmt(new Date())

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <button onClick={prevWeek} className="p-1 hover:bg-slate-100 rounded-lg transition">
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={thisWeek} className="px-3 py-1 text-xs font-medium text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition">
                        Today
                    </button>
                    <button onClick={nextWeek} className="p-1 hover:bg-slate-100 rounded-lg transition">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
                <span className="text-sm font-medium text-slate-600">
                    {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Loading calendar...</div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                        {/* Day headers */}
                        <div className="grid grid-cols-8 border-b border-slate-100">
                            <div className="p-2" />
                            {days.map(d => (
                                <div key={fmt(d)} className={`p-2 text-center text-xs font-medium ${fmt(d) === today ? 'text-sky-600 bg-sky-50' : 'text-slate-500'
                                    }`}>
                                    <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                    <div className={`text-lg ${fmt(d) === today ? 'font-bold' : ''}`}>{d.getDate()}</div>
                                </div>
                            ))}
                        </div>

                        {/* Time grid */}
                        {hours.map(h => (
                            <div key={h} className="grid grid-cols-8 border-b border-slate-50">
                                <div className="p-1 pr-2 text-right text-xs text-slate-300 leading-8">
                                    {fmtTime(h)}
                                </div>
                                {days.map(d => {
                                    const cellEvents = getEventsForCell(d, h)
                                    return (
                                        <div key={`${fmt(d)}-${h}`} className="border-l border-slate-50 h-8 relative">
                                            {cellEvents.map((e, i) => (
                                                <div key={i} className={`absolute inset-x-0.5 rounded text-xs px-1 truncate leading-5 ${e.isNew
                                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium'
                                                        : 'bg-sky-100 text-sky-700'
                                                    }`} style={{ top: 1, height: 26 }}>
                                                    {e.summary || e.service || 'Event'}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}