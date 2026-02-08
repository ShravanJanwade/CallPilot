import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Sliders, Rocket, Plus, X, Star, Phone, ChevronRight, ChevronLeft } from 'lucide-react'
import { api } from '../services/api'
import CalendarEmbed from '../components/booking/CalendarEmbed'
import ProviderMap from '../components/campaign/ProviderMap'

const SERVICES = [
    { id: 'dentist', label: 'Dentist', emoji: '🦷' },
    { id: 'doctor', label: 'Doctor', emoji: '🩺' },
    { id: 'barber', label: 'Barber', emoji: '✂️' },
    { id: 'salon', label: 'Salon', emoji: '💇' },
    { id: 'mechanic', label: 'Mechanic', emoji: '🔧' },
    { id: 'vet', label: 'Vet', emoji: '🐾' },
    { id: 'optometrist', label: 'Optometrist', emoji: '👁️' },
    { id: 'therapist', label: 'Therapist', emoji: '🧠' },
    { id: 'chiropractor', label: 'Chiropractor', emoji: '🦴' },
]

export default function NewBooking() {
    const nav = useNavigate()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState([])
    const [custom, setCustom] = useState('')
    const [preferred, setPreferred] = useState([])
    const [prefName, setPrefName] = useState('')
    const [prefPhone, setPrefPhone] = useState('')
    const [location, setLocation] = useState('Boston, MA')
    const [maxDist, setMaxDist] = useState(10)
    const [prefDate, setPrefDate] = useState('this week')
    const [timePref, setTimePref] = useState('any')
    const [maxProv, setMaxProv] = useState(3)
    const [weights, setWeights] = useState({ availability: 40, rating: 30, distance: 20, preference: 10 })
    const [foundProviders, setFoundProviders] = useState([])
    const [mapOrigin, setMapOrigin] = useState(null)
    const [searching, setSearching] = useState(false)

    const toggle = (s) => services.includes(s) ? setServices(services.filter(x => x !== s)) : setServices([...services, s])
    const addPref = () => { if (prefName.trim()) { setPreferred([...preferred, { name: prefName, phone: prefPhone }]); setPrefName(''); setPrefPhone('') } }

    // Search providers when entering step 2 with location
    useEffect(() => {
        if (step === 2 && location && services.length > 0) searchProviders()
    }, [step])

    const searchProviders = async () => {
        setSearching(true)
        try {
            const all = []
            for (const svc of services) {
                const res = await api.searchProviders(svc, location, maxDist)
                if (res.providers) {
                    all.push(...res.providers.map(p => ({ ...p, serviceType: svc })))
                    if (res.origin) setMapOrigin(res.origin)
                }
            }
            setFoundProviders(all)
        } catch (e) { console.error(e) }
        setSearching(false)
    }

    const launch = async () => {
        setLoading(true)
        try {
            const res = await api.startCampaign({
                service_types: services,
                location, max_distance_miles: maxDist, max_providers_per_type: maxProv,
                preferred_date: prefDate, time_preference: timePref,
                preferences: { availability: weights.availability / 100, rating: weights.rating / 100, distance: weights.distance / 100, preference: weights.preference / 100 },
                preferred_providers: preferred,
            })
            nav(`/campaign/${res.group_id}`)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold text-slate-800 mb-1">Book an Appointment</h1>
                <p className="text-slate-400 mb-8">Tell us what you need — we'll handle the rest</p>
            </motion.div>

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-8">
                {['What', 'When & Where', 'Launch'].map((label, i) => (
                    <button key={i} onClick={() => setStep(i + 1)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${i + 1 === step ? 'bg-sky-500 text-white shadow-sm' :
                                i + 1 < step ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{i + 1}</span>
                        {label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* STEP 1 */}
                {step === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <label className="text-sm font-semibold text-slate-700 mb-4 block">What do you need?</label>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                                {SERVICES.map(s => (
                                    <button key={s.id} onClick={() => toggle(s.id)}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition ${services.includes(s.id) ? 'bg-sky-50 border-sky-300 shadow-sm' : 'bg-white border-slate-200 hover:border-sky-200'
                                            }`}>
                                        <span className="text-xl">{s.emoji}</span>
                                        <span className="text-xs font-medium text-slate-600">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Other service..."
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                                    onKeyDown={e => { if (e.key === 'Enter' && custom) { toggle(custom.toLowerCase()); setCustom('') } }} />
                                <button onClick={() => { if (custom) { toggle(custom.toLowerCase()); setCustom('') } }}
                                    className="px-4 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-medium">Add</button>
                            </div>
                            {services.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {services.map(s => {
                                        const svc = SERVICES.find(x => x.id === s)
                                        return (
                                            <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-full text-sm border border-sky-200">
                                                {svc?.emoji || '📋'} {svc?.label || s}
                                                <X className="w-3.5 h-3.5 cursor-pointer opacity-50 hover:opacity-100" onClick={() => toggle(s)} />
                                            </span>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-1.5">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Preferred providers
                                <span className="font-normal text-slate-400">(we'll try these first)</span>
                            </label>
                            <div className="flex gap-2 mb-3">
                                <input value={prefName} onChange={e => setPrefName(e.target.value)} placeholder="Provider name"
                                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                                <input value={prefPhone} onChange={e => setPrefPhone(e.target.value)} placeholder="Phone"
                                    className="w-36 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                                <button onClick={addPref} className="p-2.5 bg-sky-500 text-white rounded-xl"><Plus className="w-4 h-4" /></button>
                            </div>
                            {preferred.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-slate-600 py-1">
                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {p.name} {p.phone && <span className="text-slate-400">({p.phone})</span>}
                                    <X className="w-3.5 h-3.5 cursor-pointer text-slate-300 hover:text-red-400" onClick={() => setPreferred(preferred.filter((_, j) => j !== i))} />
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setStep(2)} disabled={!services.length}
                            className="w-full py-3.5 bg-sky-500 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-sky-600 transition flex items-center justify-center gap-2">
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Form */}
                            <div className="space-y-5">
                                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                    <label className="text-sm font-semibold text-slate-700 mb-3 block">When?</label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {['today', 'tomorrow', 'this week', 'next week'].map(d => (
                                            <button key={d} onClick={() => setPrefDate(d)}
                                                className={`px-4 py-2 rounded-xl text-sm border capitalize transition ${prefDate === d ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'
                                                    }`}>{d}</button>
                                        ))}
                                    </div>
                                    <label className="text-sm font-medium text-slate-600 mb-2 block">Time preference</label>
                                    <div className="flex gap-2">
                                        {['any', 'morning', 'afternoon', 'evening'].map(t => (
                                            <button key={t} onClick={() => setTimePref(t)}
                                                className={`flex-1 py-2 rounded-xl text-xs font-medium border capitalize transition ${timePref === t ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-500 border-slate-200'
                                                    }`}>{t}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                    <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-sky-500" /> Location
                                    </label>
                                    <input value={location} onChange={e => setLocation(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 mb-3" />
                                    <label className="text-sm text-slate-500 mb-2 block">Max distance: <strong>{maxDist} miles</strong></label>
                                    <input type="range" min={1} max={30} value={maxDist} onChange={e => setMaxDist(+e.target.value)}
                                        className="w-full accent-sky-500" />
                                    <button onClick={searchProviders} disabled={searching}
                                        className="w-full mt-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition flex items-center justify-center gap-2">
                                        <Search className="w-4 h-4" /> {searching ? 'Searching...' : 'Search Providers'}
                                    </button>
                                </div>
                            </div>

                            {/* Right: Map */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                <div className="h-80">
                                    {mapOrigin ? (
                                        <ProviderMap providers={foundProviders} origin={mapOrigin} radiusMiles={maxDist} height="100%" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-sm text-slate-400">
                                            Enter location and search to see providers on map
                                        </div>
                                    )}
                                </div>
                                {foundProviders.length > 0 && (
                                    <div className="p-3 border-t border-slate-100 max-h-48 overflow-y-auto">
                                        {foundProviders.slice(0, 8).map(p => (
                                            <div key={p.provider_id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                                                {p.photo_url ? <img src={p.photo_url} className="w-8 h-8 rounded-lg object-cover" /> :
                                                    <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-sky-400" /></div>}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                        {p.rating > 0 && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />{p.rating}</span>}
                                                        {p.distance_miles < 999 && <span>{p.distance_miles}mi</span>}
                                                    </div>
                                                </div>
                                                {p.phone && <Phone className="w-3 h-3 text-slate-300" />}
                                            </div>
                                        ))}
                                        <p className="text-xs text-slate-400 text-center pt-2">{foundProviders.length} providers found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Calendar */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Your Calendar — pick a time that works</h3>
                            <CalendarEmbed />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 flex items-center justify-center gap-2">
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <label className="text-sm font-semibold text-slate-700 mb-4 block flex items-center gap-1.5">
                                <Sliders className="w-4 h-4 text-sky-500" /> What matters most?
                            </label>
                            {[
                                { key: 'availability', label: '⏰ Earliest Available' },
                                { key: 'rating', label: '⭐ Best Rated' },
                                { key: 'distance', label: '📍 Closest' },
                                { key: 'preference', label: '❤️ My Preferred' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-3 mb-4">
                                    <span className="text-sm text-slate-600 w-44">{label}</span>
                                    <input type="range" min={0} max={100} value={weights[key]}
                                        onChange={e => setWeights({ ...weights, [key]: +e.target.value })}
                                        className="flex-1 accent-sky-500 h-2" />
                                    <span className="text-sm font-semibold text-sky-600 w-12 text-right">{weights[key]}%</span>
                                </div>
                            ))}
                            <div className="mt-4">
                                <label className="text-sm text-slate-600 mb-2 block">Providers to call per service: <strong>{maxProv}</strong></label>
                                <input type="range" min={1} max={15} value={maxProv} onChange={e => setMaxProv(+e.target.value)}
                                    className="w-full accent-sky-500" />
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-sky-50 to-cyan-50 rounded-2xl p-6 border border-sky-100">
                            <h3 className="font-semibold text-slate-800 mb-2">Ready to launch</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                We'll search for <strong>{services.map(s => SERVICES.find(x => x.id === s)?.label || s).join(' + ')}</strong> near <strong>{location}</strong> within <strong>{maxDist} miles</strong>,
                                call up to <strong>{maxProv} providers</strong> per service, and find the best slot <strong>{prefDate}</strong>.
                            </p>
                            {foundProviders.length > 0 && (
                                <p className="text-xs text-sky-600 mt-2">📍 {foundProviders.length} providers already found nearby</p>
                            )}
                            {import.meta.env.VITE_SPAM_PREVENT === 'on' && (
                                <p className="text-xs text-amber-600 mt-2">🛡️ Safe mode active — calls go to test numbers only</p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep(2)} className="flex-1 py-3.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <button onClick={launch} disabled={loading || !services.length}
                                className="flex-1 py-3.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
                                <Rocket className="w-5 h-5" />
                                {loading ? 'Launching...' : 'Start Calling'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}