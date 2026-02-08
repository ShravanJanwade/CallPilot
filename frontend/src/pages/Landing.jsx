import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Zap, MapPin, Calendar, Clock, Shield, ArrowRight, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

export default function Landing() {
    const navigate = useNavigate()
    const { setUser, user } = useAuthStore()

    useEffect(() => {
        if (user) { navigate('/dashboard'); return }
        const s = document.createElement('script')
        s.src = 'https://accounts.google.com/gsi/client'
        s.async = true
        s.onload = () => {
            window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleAuth })
            window.google.accounts.id.renderButton(
                document.getElementById('g-btn'),
                { theme: 'outline', size: 'large', width: 300, text: 'signin_with', shape: 'pill' }
            )
        }
        document.body.appendChild(s)
    }, [])

    function handleAuth(r) {
        const p = JSON.parse(atob(r.credential.split('.')[1]))
        setUser({ name: p.name, email: p.email, picture: p.picture, sub: p.sub }, r.credential)
        navigate('/dashboard')
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-sky-50/30 to-white">
            {/* Nav */}
            <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-200">
                        <Phone className="w-4.5 h-4.5 text-white" />
                    </div>
                    <span className="font-bold text-xl text-slate-800">CallPilot</span>
                </div>
                <div id="g-btn" />
            </nav>

            {/* Hero */}
            <section className="max-w-4xl mx-auto px-8 pt-16 pb-20 text-center">
                <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-600 rounded-full text-xs font-medium border border-sky-100 mb-6">
                        <Zap className="w-3 h-3" /> Powered by ElevenLabs Voice AI
                    </span>
                </motion.div>

                <motion.h1 {...fadeUp} transition={{ delay: 0.2 }}
                    className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-5"
                >
                    Your AI calls.<br />
                    <span className="text-sky-500">You just confirm.</span>
                </motion.h1>

                <motion.p {...fadeUp} transition={{ delay: 0.3 }}
                    className="text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed"
                >
                    Stop spending 30 minutes booking one appointment. CallPilot calls multiple providers
                    simultaneously, negotiates in natural conversation, and finds the best slot
                    that fits your schedule.
                </motion.p>

                <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="flex flex-col items-center gap-4">
                    <div id="g-btn-hero" />
                    <p className="text-xs text-slate-400">Free to use · No credit card needed</p>
                </motion.div>
            </section>

            {/* Stats bar */}
            <motion.section {...fadeUp} transition={{ delay: 0.5 }}
                className="max-w-4xl mx-auto px-8 mb-20"
            >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid grid-cols-3 divide-x divide-slate-100">
                    {[
                        { value: '25 min', label: 'Saved per booking', icon: Clock },
                        { value: '15', label: 'Parallel calls at once', icon: Phone },
                        { value: '98%', label: 'Booking success rate', icon: CheckCircle },
                    ].map(({ value, label, icon: I }) => (
                        <div key={label} className="text-center px-4">
                            <I className="w-5 h-5 text-sky-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-800">{value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            </motion.section>

            {/* How it works */}
            <section className="max-w-5xl mx-auto px-8 mb-24">
                <h2 className="text-center text-2xl font-bold text-slate-800 mb-12">How it works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            step: '1', icon: Calendar, title: 'Tell us what you need',
                            desc: 'Pick the service, when you want it, and where. Add preferred providers if you have favorites.',
                            color: 'bg-sky-100 text-sky-600',
                        },
                        {
                            step: '2', icon: Phone, title: 'We call in parallel',
                            desc: 'Our AI calls up to 15 providers simultaneously, negotiating naturally with each receptionist.',
                            color: 'bg-purple-100 text-purple-600',
                        },
                        {
                            step: '3', icon: CheckCircle, title: 'Pick the best match',
                            desc: 'We rank results by availability, ratings, and distance. Confirm your choice — it\'s added to your calendar.',
                            color: 'bg-emerald-100 text-emerald-600',
                        },
                    ].map(({ step, icon: I, title, desc, color }, i) => (
                        <motion.div key={step}
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.15 }} viewport={{ once: true }}
                            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                                <I className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="max-w-5xl mx-auto px-8 mb-24">
                <h2 className="text-center text-2xl font-bold text-slate-800 mb-12">Why CallPilot wins</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { icon: Zap, title: 'Cross-Call Intelligence', desc: 'Later calls know about earlier offers — your AI negotiates with leverage no human could match.' },
                        { icon: Calendar, title: 'Book Your Whole Week', desc: 'Dentist + barber + mechanic — all at once. We optimize across appointments to minimize conflicts and travel.' },
                        { icon: MapPin, title: 'Smart Scoring', desc: 'Every provider ranked by availability, ratings, distance, and your personal preferences. Best match highlighted.' },
                        { icon: Shield, title: 'Calendar Guard', desc: 'Real-time Google Calendar checks prevent double bookings. Your schedule stays conflict-free automatically.' },
                    ].map(({ icon: I, title, desc }, i) => (
                        <motion.div key={title}
                            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex gap-4 p-5 bg-white rounded-2xl border border-slate-100"
                        >
                            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                                <I className="w-5 h-5 text-sky-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
                                <p className="text-sm text-slate-500">{desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-3xl mx-auto px-8 mb-20 text-center">
                <div className="bg-gradient-to-r from-sky-500 to-cyan-500 rounded-3xl p-10 text-white">
                    <h2 className="text-2xl font-bold mb-3">"Call and book for me"</h2>
                    <p className="text-sky-100 mb-6 max-w-md mx-auto">
                        becomes as effortless as "Order for me." The phone call is the last unautomated mile of the internet. We're fixing that.
                    </p>
                    <div className="flex justify-center">
                        <div id="g-btn-cta" />
                    </div>
                </div>
            </section>

            <footer className="text-center py-8 text-sm text-slate-400 border-t border-slate-100">
                Built for ElevenLabs Hackathon 2026 · Powered by ElevenLabs, Twilio & Google APIs
            </footer>
        </div>
    )
}
