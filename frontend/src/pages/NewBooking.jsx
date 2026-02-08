import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Sliders, Rocket, Plus, X, Star } from 'lucide-react'
import { api } from '../services/api'

const SERVICE_OPTIONS = [
    'Dentist', 'Doctor', 'Barber', 'Salon', 'Mechanic',
    'Vet', 'Optometrist', 'Therapist', 'Chiropractor',
]

export default function NewBooking() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Step 1
    const [services, setServices] = useState([])
    const [customService, setCustomService] = useState('')
    const [preferred, setPreferred] = useState([])
    const [prefName, setPrefName] = useState('')
    const [prefPhone, setPrefPhone] = useState('')

    // Step 2
    const [location, setLocation] = useState('Boston, MA')
    const [maxDistance, setMaxDistance] = useState(10)
    const [preferredDate, setPreferredDate] = useState('this week')
    const [timePreference, setTimePreference] = useState('any')

    // Step 3
    const [maxProviders, setMaxProviders] = useState(3)
    const [weights, setWeights] = useState({
        availability: 40, rating: 30, distance: 20, preference: 10,
    })

    const addService = (svc) => {
        if (!services.includes(svc)) setServices([...services, svc])
    }
    const removeService = (svc) => setServices(services.filter(s => s !== svc))
    const addPreferred = () => {
        if (prefName.trim()) {
            setPreferred([...preferred, { name: prefName, phone: prefPhone }])
            setPrefName(''); setPrefPhone('')
        }
    }

    const handleLaunch = async () => {
        if (services.length === 0) return
        setLoading(true)
        try {
            const res = await api.startCampaign({
                service_types: services.map(s => s.toLowerCase()),
                location,
                max_distance_miles: maxDistance,
                max_providers_per_type: maxProviders,
                preferred_date: preferredDate,
                time_preference: timePreference,
                preferences: {
                    availability: weights.availability / 100,
                    rating: weights.rating / 100,
                    distance: weights.distance / 100,
                    preference: weights.preference / 100,
                },
                preferred_providers: preferred,
            })
            navigate(`/campaign/${res.group_id}`)
        } catch (err) {
            console.error('Campaign start error:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Book an Appointment</h1>
            <p className="text-slate-400 mb-8">Tell us what you need and we'll handle the calls</p>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3].map(s => (
                    <button key={s} onClick={() => setStep(s)}
                        className={`flex-1 h-2 rounded-full transition ${s <= step ? 'bg-sky-500' : 'bg-slate-200'}`}
                    />
                ))}
            </div>

            {/* STEP 1: What */}
            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-3 block">What do you need?</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {SERVICE_OPTIONS.map(s => (
                                <button key={s} onClick={() => services.includes(s) ? removeService(s) : addService(s)}
                                    className={`px-4 py-2 rounded-lg text-sm border transition ${services.includes(s)
                                            ? 'bg-sky-500 text-white border-sky-500'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={customService} onChange={e => setCustomService(e.target.value)}
                                placeholder="Other service..." className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                            <button onClick={() => { if (customService) { addService(customService); setCustomService('') } }}
                                className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm">Add</button>
                        </div>
                        {services.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {services.map(s => (
                                    <span key={s} className="flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-sm">
                                        {s} <X className="w-3 h-3 cursor-pointer" onClick={() => removeService(s)} />
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                            <Star className="w-4 h-4 inline mr-1 text-amber-400" />
                            Preferred providers (optional — we'll try these first)
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input value={prefName} onChange={e => setPrefName(e.target.value)}
                                placeholder="Provider name" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            <input value={prefPhone} onChange={e => setPrefPhone(e.target.value)}
                                placeholder="Phone (optional)" className="w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            <button onClick={addPreferred} className="p-2 bg-sky-500 text-white rounded-lg"><Plus className="w-4 h-4" /></button>
                        </div>
                        {preferred.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                                <Star className="w-3 h-3 text-amber-400" /> {p.name} {p.phone && `(${p.phone})`}
                                <X className="w-3 h-3 cursor-pointer text-slate-400" onClick={() => setPreferred(preferred.filter((_, j) => j !== i))} />
                            </div>
                        ))}
                    </div>

                    <button onClick={() => setStep(2)} disabled={services.length === 0}
                        className="w-full py-3 bg-sky-500 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-sky-600 transition">
                        Next — When & Where
                    </button>
                </div>
            )}

            {/* STEP 2: When & Where */}
            {step === 2 && (
                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">When do you need it?</label>
                        <div className="flex flex-wrap gap-2">
                            {['today', 'tomorrow', 'this week', 'next week', 'this month'].map(d => (
                                <button key={d} onClick={() => setPreferredDate(d)}
                                    className={`px-4 py-2 rounded-lg text-sm border transition capitalize ${preferredDate === d ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                >{d}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Time preference</label>
                        <div className="flex gap-2">
                            {['any', 'morning', 'afternoon', 'evening'].map(t => (
                                <button key={t} onClick={() => setTimePreference(t)}
                                    className={`flex-1 py-2 rounded-lg text-sm border transition capitalize ${timePreference === t ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                >{t}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-1">
                            <MapPin className="w-4 h-4" /> Location
                        </label>
                        <input value={location} onChange={e => setLocation(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="City or address" />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Max distance: {maxDistance} miles
                        </label>
                        <input type="range" min={1} max={30} value={maxDistance}
                            onChange={e => setMaxDistance(Number(e.target.value))}
                            className="w-full accent-sky-500" />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setStep(1)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Back</button>
                        <button onClick={() => setStep(3)} className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600">
                            Next — Priorities
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Priorities & Launch */}
            {step === 3 && (
                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-3 block flex items-center gap-1">
                            <Sliders className="w-4 h-4" /> What matters most?
                        </label>
                        {[
                            { key: 'availability', label: '⏰ Earliest Available', emoji: '' },
                            { key: 'rating', label: '⭐ Best Rated', emoji: '' },
                            { key: 'distance', label: '📍 Closest', emoji: '' },
                            { key: 'preference', label: '❤️ My Preferred', emoji: '' },
                        ].map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-3 mb-3">
                                <span className="text-sm text-slate-600 w-40">{label}</span>
                                <input type="range" min={0} max={100} value={weights[key]}
                                    onChange={e => setWeights({ ...weights, [key]: Number(e.target.value) })}
                                    className="flex-1 accent-sky-500" />
                                <span className="text-sm text-slate-400 w-10 text-right">{weights[key]}%</span>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Providers to call per service: {maxProviders}
                        </label>
                        <input type="range" min={1} max={15} value={maxProviders}
                            onChange={e => setMaxProviders(Number(e.target.value))}
                            className="w-full accent-sky-500" />
                    </div>

                    {/* Summary */}
                    <div className="bg-sky-50 rounded-xl p-5 border border-sky-100">
                        <h3 className="font-medium text-slate-800 mb-2">Summary</h3>
                        <p className="text-sm text-slate-600">
                            We'll search for <strong>{services.join(' + ')}</strong> near <strong>{location}</strong> within <strong>{maxDistance} miles</strong>,
                            call up to <strong>{maxProviders} providers</strong> per service, and find the best slot <strong>{preferredDate}</strong>.
                        </p>
                        {import.meta.env.VITE_SPAM_PREVENT === 'on' && (
                            <p className="text-xs text-amber-600 mt-2">🛡️ Safe mode: calls will go to test numbers only</p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setStep(2)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Back</button>
                        <button onClick={handleLaunch} disabled={loading}
                            className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
                            <Rocket className="w-5 h-5" />
                            {loading ? 'Launching...' : 'Start Calling'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}