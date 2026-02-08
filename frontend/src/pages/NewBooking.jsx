import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Sliders, Rocket, Plus, X, Star, Phone, ChevronRight, ChevronLeft, Navigation, Clock, CheckCircle2, Sparkles, Users, Gauge } from 'lucide-react'
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

    // Step 1
    const [services, setServices] = useState([])
    const [custom, setCustom] = useState('')
    const [preferred, setPreferred] = useState([])
    const [prefName, setPrefName] = useState('')
    const [prefPhone, setPrefPhone] = useState('')

    // Step 2
    const [location, setLocation] = useState('')
    const [locationLoading, setLocationLoading] = useState(false)
    const [maxDist, setMaxDist] = useState(10)
    const [prefDate, setPrefDate] = useState('this week')
    const [timePref, setTimePref] = useState('any')
    const [foundProviders, setFoundProviders] = useState([])
    const [mapOrigin, setMapOrigin] = useState(null)
    const [searching, setSearching] = useState(false)

    // Step 3
    const [maxProv, setMaxProv] = useState(3)
    const [weights, setWeights] = useState({ availability: 40, rating: 30, distance: 20, preference: 10 })

    const toggle = (s) => services.includes(s) ? setServices(services.filter(x => x !== s)) : setServices([...services, s])
    const addPref = () => { if (prefName.trim()) { setPreferred([...preferred, { name: prefName, phone: prefPhone }]); setPrefName(''); setPrefPhone('') } }

    // Geolocation — "Use Current Location"
    const getCurrentLocation = () => {
        if (!navigator.geolocation) return
        setLocationLoading(true)
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords
                setMapOrigin({ lat: latitude, lng: longitude })
                // Reverse geocode
                try {
                    const res = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
                    )
                    const data = await res.json()
                    if (data.results?.[0]) {
                        const addr = data.results[0].formatted_address
                        setLocation(addr)
                    } else {
                        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
                    }
                } catch {
                    setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
                }
                setLocationLoading(false)
            },
            () => { setLocationLoading(false) },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    useEffect(() => {
        if (step === 2 && location && services.length > 0) searchProviders()
    }, [step])

    const searchProviders = async () => {
        if (!location) return
        setSearching(true)
        try {
            const all = []
            for (const svc of services) {
                const res = await api.searchProviders(svc, location, maxDist)
                if (res.providers) {
                    all.push(...res.providers.map(p => ({ ...p, serviceType: svc })))
                    if (res.origin && !mapOrigin) setMapOrigin(res.origin)
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
                service_types: services, location, max_distance_miles: maxDist,
                max_providers_per_type: maxProv, preferred_date: prefDate, time_preference: timePref,
                preferences: { availability: weights.availability / 100, rating: weights.rating / 100, distance: weights.distance / 100, preference: weights.preference / 100 },
                preferred_providers: preferred,
            })
            nav(`/campaign/${res.group_id}`)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const DIST_LABELS = { 1: '1mi', 5: '5mi', 10: '10mi', 15: '15mi', 20: '20mi', 30: '30mi' }

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

                {/* ===== STEP 1 — UNCHANGED ===== */}
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

                {/* ===== STEP 2 — IMPROVED ===== */}
                {step === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">

                        {/* When */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-sky-500" /> When do you need it?
                            </label>
                            <div className="flex flex-wrap gap-2 mb-5">
                                {['today', 'tomorrow', 'this week', 'next week', 'this month'].map(d => (
                                    <button key={d} onClick={() => setPrefDate(d)}
                                        className={`px-4 py-2 rounded-xl text-sm border capitalize transition ${prefDate === d ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'
                                            }`}>{d}</button>
                                ))}
                            </div>
                            <label className="text-sm font-medium text-slate-600 mb-2 block">Time of day</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'any', label: 'Any time', sub: 'All day' },
                                    { id: 'morning', label: '🌅 Morning', sub: '8AM – 12PM' },
                                    { id: 'afternoon', label: '☀️ Afternoon', sub: '12PM – 5PM' },
                                    { id: 'evening', label: '🌆 Evening', sub: '5PM – 8PM' },
                                ].map(t => (
                                    <button key={t.id} onClick={() => setTimePref(t.id)}
                                        className={`py-3 px-2 rounded-xl border text-center transition ${timePref === t.id ? 'bg-sky-50 border-sky-300 shadow-sm' : 'bg-white border-slate-200 hover:border-sky-200'
                                            }`}>
                                        <div className="text-xs font-medium text-slate-700">{t.label}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{t.sub}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Where — Location + Map side by side */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-sky-500" /> Where are you?
                                </label>
                                <div className="flex gap-2 mb-4">
                                    <input value={location} onChange={e => setLocation(e.target.value)}
                                        placeholder="Enter city, address, or zip code..."
                                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                                    <button onClick={getCurrentLocation} disabled={locationLoading}
                                        className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition whitespace-nowrap disabled:opacity-50">
                                        <Navigation className={`w-4 h-4 ${locationLoading ? 'animate-pulse' : ''}`} />
                                        {locationLoading ? 'Locating...' : 'Use My Location'}
                                    </button>
                                </div>

                                {/* Distance slider */}
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-slate-600">Search radius</span>
                                        <span className="text-sm font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-lg">{maxDist} miles</span>
                                    </div>
                                    <input type="range" min={1} max={30} value={maxDist} onChange={e => setMaxDist(+e.target.value)}
                                        className="w-full accent-sky-500 h-2 cursor-pointer" />
                                    <div className="flex justify-between mt-1.5">
                                        {[1, 5, 10, 15, 20, 30].map(v => (
                                            <button key={v} onClick={() => setMaxDist(v)}
                                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${maxDist === v ? 'text-sky-600 bg-sky-100' : 'text-slate-400 hover:text-slate-600'
                                                    }`}>{v}mi</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Map */}
                            <div className="h-80 relative">
                                {mapOrigin || location ? (
                                    <>
                                        <ProviderMap
                                            providers={foundProviders}
                                            origin={mapOrigin || { lat: 42.3601, lng: -71.0589 }}
                                            radiusMiles={maxDist}
                                            height="100%"
                                        />
                                        {/* Radius label overlay */}
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
                                            <span className="text-xs font-medium text-slate-600">
                                                📍 {maxDist}mi radius · {foundProviders.length} providers
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                                        <MapPin className="w-8 h-8 mb-2 opacity-30" />
                                        <p className="text-sm">Enter your location to see providers on the map</p>
                                        <button onClick={getCurrentLocation}
                                            className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition">
                                            <Navigation className="w-3.5 h-3.5" /> Use Current Location
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Search button */}
                            {location && (
                                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                    <button onClick={searchProviders} disabled={searching}
                                        className="w-full py-2.5 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 transition flex items-center justify-center gap-2 disabled:opacity-50">
                                        <Search className="w-4 h-4" />
                                        {searching ? 'Searching nearby providers...' : `Search ${services.map(s => SERVICES.find(x => x.id === s)?.label || s).join(' & ')} nearby`}
                                    </button>
                                </div>
                            )}

                            {/* Provider list under map */}
                            {foundProviders.length > 0 && (
                                <div className="p-4 border-t border-slate-100 max-h-52 overflow-y-auto">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{foundProviders.length} providers found</p>
                                    {foundProviders.slice(0, 10).map(p => (
                                        <div key={p.provider_id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                                            {p.photo_url ? <img src={p.photo_url} className="w-9 h-9 rounded-lg object-cover" alt="" /> :
                                                <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-sky-400" /></div>}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    {p.rating > 0 && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />{p.rating}</span>}
                                                    {p.distance_miles < 999 && <span>{p.distance_miles}mi · {p.duration_text || ''}</span>}
                                                </div>
                                            </div>
                                            {p.phone && <Phone className="w-3 h-3 text-emerald-400" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Calendar */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                                📅 Your Calendar — see what's open
                            </h3>
                            <CalendarEmbed />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="flex-1 py-3.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <button onClick={() => setStep(3)} className="flex-1 py-3.5 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 flex items-center justify-center gap-2">
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ===== STEP 3 — IMPROVED ===== */}
                {step === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">

                        {/* Priority sliders */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-1.5">
                                <Sliders className="w-4 h-4 text-sky-500" /> What matters most to you?
                            </label>
                            <p className="text-xs text-slate-400 mb-5">Adjust how we rank the results. Higher = more important.</p>

                            <div className="space-y-5">
                                {[
                                    { key: 'availability', label: 'Earliest Available', emoji: '⏰', color: 'sky', desc: 'Prioritize the soonest open slot' },
                                    { key: 'rating', label: 'Best Rated', emoji: '⭐', color: 'amber', desc: 'Prioritize highest Google reviews' },
                                    { key: 'distance', label: 'Closest to You', emoji: '📍', color: 'emerald', desc: 'Prioritize shortest travel distance' },
                                    { key: 'preference', label: 'My Favorites', emoji: '❤️', color: 'rose', desc: 'Prioritize your preferred providers' },
                                ].map(({ key, label, emoji, color, desc }) => (
                                    <div key={key} className="bg-slate-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{emoji}</span>
                                                <div>
                                                    <span className="text-sm font-medium text-slate-700">{label}</span>
                                                    <p className="text-[10px] text-slate-400">{desc}</p>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg text-sm font-bold ${weights[key] >= 40 ? `bg-${color}-100 text-${color}-600` :
                                                    weights[key] >= 20 ? 'bg-slate-100 text-slate-600' :
                                                        'bg-slate-50 text-slate-400'
                                                }`}>
                                                {weights[key]}%
                                            </div>
                                        </div>
                                        <input type="range" min={0} max={100} step={5} value={weights[key]}
                                            onChange={e => setWeights({ ...weights, [key]: +e.target.value })}
                                            className={`w-full h-2 cursor-pointer accent-${color}-500`}
                                            style={{ accentColor: color === 'sky' ? '#0ea5e9' : color === 'amber' ? '#f59e0b' : color === 'emerald' ? '#22c55e' : '#f43f5e' }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* How many to call */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-sky-500" /> How many providers to call?
                            </label>
                            <p className="text-xs text-slate-400 mb-4">More calls = better chances, but takes slightly longer</p>

                            <div className="bg-slate-50 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-4">
                                        {[1, 3, 5, 10, 15].map(v => (
                                            <button key={v} onClick={() => setMaxProv(v)}
                                                className={`w-10 h-10 rounded-xl text-sm font-bold transition ${maxProv === v
                                                        ? 'bg-sky-500 text-white shadow-sm'
                                                        : 'bg-white border border-slate-200 text-slate-500 hover:border-sky-300'
                                                    }`}>{v}</button>
                                        ))}
                                    </div>
                                    <span className="text-sm text-slate-500">per service</span>
                                </div>
                                <input type="range" min={1} max={15} value={maxProv} onChange={e => setMaxProv(+e.target.value)}
                                    className="w-full accent-sky-500 h-2 cursor-pointer" />
                                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                    <Gauge className="w-3.5 h-3.5" />
                                    {maxProv <= 3 ? 'Quick search — results in under a minute' :
                                        maxProv <= 7 ? 'Balanced — good coverage with fast results' :
                                            'Thorough search — maximum coverage, may take 2-3 minutes'}
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 rounded-2xl p-6 border border-sky-100 shadow-sm">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-5 h-5 text-sky-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Ready to launch</h3>
                                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                        We'll call up to <strong className="text-sky-600">{maxProv * services.length} providers</strong> ({maxProv} per service)
                                        for <strong className="text-sky-600">{services.map(s => SERVICES.find(x => x.id === s)?.label || s).join(' + ')}</strong> near <strong className="text-sky-600">{location || 'your location'}</strong> within <strong className="text-sky-600">{maxDist} miles</strong>,
                                        looking for the best slot <strong className="text-sky-600">{prefDate}</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Service tags */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {services.map(s => {
                                    const svc = SERVICES.find(x => x.id === s)
                                    return (
                                        <span key={s} className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-medium border border-slate-200 shadow-sm">
                                            {svc?.emoji} {svc?.label || s}
                                        </span>
                                    )
                                })}
                            </div>

                            {foundProviders.length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg inline-flex">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> {foundProviders.length} providers already found nearby
                                </div>
                            )}

                            {import.meta.env.VITE_SPAM_PREVENT === 'on' && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg inline-flex mt-2 ml-2">
                                    🛡️ Safe mode — test numbers only
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button onClick={() => setStep(2)} className="flex-1 py-3.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <button onClick={launch} disabled={loading || !services.length || !location}
                                className="flex-2 py-3.5 px-8 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-sky-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                                style={{ flex: 2 }}>
                                <Rocket className="w-5 h-5" />
                                {loading ? 'Launching...' : `Start Calling ${maxProv * services.length} Providers`}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}