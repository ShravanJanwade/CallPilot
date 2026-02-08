import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { api } from '../../services/api'

function getWeekDates(base) {
    const d = new Date(base)
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
    return Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(mon)
        dt.setDate(mon.getDate() + i)
        return dt
    })
}

function fmt(d) { return d.toISOString().split('T')[0] }

export default function CalendarEmbed({ newBookings = [] }) {
    const [weekStart, setWeekStart] = useState(new Date())
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)

    const days = getWeekDates(weekStart)
    const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8AM - 7PM

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

    const today = fmt(new Date())

    const getEventsForCell = (day, hour) => {
        const dayStr = fmt(day)
        return [...events, ...newBookings].filter(e => {
            try {
                const start = new Date(e.start || `${e.date}T${e.time || '00:00'}`)
                return fmt(start) === dayStr && start.getHours() === hour
            } catch { return false }
        })
    }

    const totalEvents = events.length

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    <span className="text-sm font-semibold text-slate-700">Your Schedule</span>
                    {totalEvents > 0 && (
                        <span className="text-xs text-slate-400 ml-1">({totalEvents} event{totalEvents !== 1 ? 's' : ''})</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={prevWeek} className="p-1.5 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200">
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={thisWeek} className="px-3 py-1 text-xs font-medium text-sky-600 bg-white rounded-lg hover:bg-sky-50 transition border border-slate-200">
                        Today
                    </button>
                    <button onClick={nextWeek} className="p-1.5 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
                <span className="text-xs font-medium text-slate-500">
                    {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
            </div>

            {loading ? (
                <div className="h-72 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-3" />
                    <p className="text-sm">Loading your calendar...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-[680px]">
                        {/* Day headers */}
                        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-100">
                            <div className="p-2" />
                            {days.map(d => {
                                const isToday = fmt(d) === today
                                return (
                                    <div key={fmt(d)} className={`py-2.5 text-center border-l border-slate-50 ${isToday ? 'bg-sky-50/60' : ''}`}>
                                        <div className={`text-[10px] uppercase tracking-wider ${isToday ? 'text-sky-500 font-semibold' : 'text-slate-400'}`}>
                                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </div>
                                        <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-sky-600' : 'text-slate-700'}`}>
                                            {d.getDate()}
                                        </div>
                                        {isToday && <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mx-auto mt-1" />}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Time grid */}
                        <div className="relative">
                            {hours.map((h, hi) => (
                                <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)]">
                                    <div className="pr-3 py-0.5 text-right text-[10px] text-slate-300 font-medium leading-10 border-b border-slate-50">
                                        {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                                    </div>
                                    {days.map(d => {
                                        const isToday = fmt(d) === today
                                        const cellEvents = getEventsForCell(d, h)
                                        return (
                                            <div key={`${fmt(d)}-${h}`}
                                                className={`border-l border-b border-slate-50 h-10 relative ${isToday ? 'bg-sky-50/30' : hi % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                                    }`}>
                                                {cellEvents.map((e, i) => (
                                                    <div key={i}
                                                        className={`absolute inset-x-1 top-0.5 rounded-md text-[10px] px-1.5 py-0.5 truncate leading-4 font-medium shadow-sm ${e.isNew
                                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 ring-2 ring-emerald-200/50'
                                                                : 'bg-sky-100 text-sky-700 border border-sky-200'
                                                            }`} style={{ height: 34 }}>
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
                </div>
            )}

            {/* Footer hint */}
            <div className="px-5 py-2.5 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 text-center">
                    {events.length > 0
                        ? '🔵 Blue = existing events · 🟢 Green = newly booked'
                        : 'Your calendar is clear — any time works!'}
                </p>
            </div>
        </div>
    )
}