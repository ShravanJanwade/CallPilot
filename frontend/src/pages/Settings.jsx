import { useState } from 'react'
import { User, Phone, Shield, Sliders } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function Settings() {
    const user = useAuthStore((s) => s.user)
    const [phone, setPhone] = useState('')
    const [agentName, setAgentName] = useState('Alex')
    const [saved, setSaved] = useState(false)

    const handleSave = () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-bold text-slate-800 mb-8">Settings</h1>

            {/* Profile */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-sky-500" />
                    <h2 className="font-semibold text-slate-800">Profile</h2>
                </div>
                <div className="flex items-center gap-4">
                    {user?.picture && <img src={user.picture} alt="" className="w-16 h-16 rounded-full" />}
                    <div>
                        <p className="font-medium text-slate-800">{user?.name}</p>
                        <p className="text-sm text-slate-400">{user?.email}</p>
                        <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Google Connected ✓
                        </span>
                    </div>
                </div>
            </div>

            {/* Phone */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Phone className="w-5 h-5 text-sky-500" />
                    <h2 className="font-semibold text-slate-800">Phone Number</h2>
                </div>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm" />
                <p className="text-xs text-slate-400 mt-2">Used for outbound caller ID</p>
            </div>

            {/* Agent Config */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Sliders className="w-5 h-5 text-sky-500" />
                    <h2 className="font-semibold text-slate-800">Agent Configuration</h2>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Agent Name</label>
                        <input value={agentName} onChange={e => setAgentName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                </div>
            </div>

            {/* Spam Prevention */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-sky-500" />
                    <h2 className="font-semibold text-slate-800">Safe Mode</h2>
                </div>
                <p className="text-sm text-slate-500">
                    {import.meta.env.VITE_SPAM_PREVENT === 'on'
                        ? '🛡️ Safe mode is ON — calls go to test numbers instead of real businesses. Change VITE_SPAM_PREVENT in .env to disable.'
                        : '⚠️ Safe mode is OFF — calls will go to real business numbers.'}
                </p>
            </div>

            <button onClick={handleSave}
                className="w-full py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 transition">
                {saved ? '✓ Saved' : 'Save Settings'}
            </button>
        </div>
    )
}