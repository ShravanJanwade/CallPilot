import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import PageContainer from '../components/layout/PageContainer'
import { User, Phone, Sliders, Bot, Calendar, Save, Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Settings() {
    const { user } = useAuthStore()
    const settings = useSettingsStore()
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        settings.loadSettings()
    }, [])

    const handleSave = async () => {
        setSaving(true)
        const success = await settings.saveSettings()
        setSaving(false)
        if (success) {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    const sections = [
        {
            id: 'profile',
            title: 'Profile',
            icon: User,
            content: (
                <div className="flex items-center gap-4">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-2xl font-semibold text-primary">{user?.name?.[0] || 'U'}</span>
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-gray-900">{user?.name || 'User'}</p>
                        <p className="text-sm text-gray-500">{user?.email || 'email@example.com'}</p>
                        <p className="text-xs text-gray-400 mt-1">Connected via Google</p>
                    </div>
                </div>
            )
        },
        {
            id: 'phone',
            title: 'Phone Number',
            icon: Phone,
            content: (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Phone Number
                    </label>
                    <input
                        type="tel"
                        value={settings.phoneNumber}
                        onChange={(e) => settings.updateSetting('phoneNumber', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="input max-w-md"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Used for caller ID when making outbound calls on your behalf
                    </p>
                </div>
            )
        },
        {
            id: 'priorities',
            title: 'Default Priorities',
            icon: Sliders,
            content: (
                <div className="space-y-4 max-w-md">
                    <p className="text-sm text-gray-600 mb-4">
                        Set your default priority weights for booking appointments
                    </p>
                    {[
                        { key: 'defaultWeightAvailability', label: 'Earliest Availability', emoji: '⏰' },
                        { key: 'defaultWeightRating', label: 'Provider Rating', emoji: '⭐' },
                        { key: 'defaultWeightDistance', label: 'Closest Distance', emoji: '📍' },
                        { key: 'defaultWeightPreference', label: 'Personal Preference', emoji: '❤️' },
                    ].map(({ key, label, emoji }) => (
                        <div key={key}>
                            <div className="flex justify-between text-sm mb-1">
                                <span>{emoji} {label}</span>
                                <span className="font-medium">{settings[key]}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={settings[key]}
                                onChange={(e) => settings.updateSetting(key, parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    ))}
                </div>
            )
        },
        {
            id: 'agent',
            title: 'Agent Defaults',
            icon: Bot,
            content: (
                <div className="space-y-4 max-w-xl">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Agent Name
                        </label>
                        <input
                            type="text"
                            value={settings.defaultAgentName}
                            onChange={(e) => settings.updateSetting('defaultAgentName', e.target.value)}
                            placeholder="Alex"
                            className="input max-w-xs"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default First Message
                        </label>
                        <textarea
                            value={settings.defaultFirstMessage}
                            onChange={(e) => settings.updateSetting('defaultFirstMessage', e.target.value)}
                            rows={3}
                            className="input"
                            placeholder="Hi, I'm calling on behalf of..."
                        />
                    </div>
                </div>
            )
        },
        {
            id: 'calendar',
            title: 'Calendar',
            icon: Calendar,
            content: (
                <div className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Calendar
                        </label>
                        <select
                            value={settings.calendarId}
                            onChange={(e) => settings.updateSetting('calendarId', e.target.value)}
                            className="input"
                        >
                            <option value="primary">Primary Calendar</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Timezone
                        </label>
                        <input
                            type="text"
                            value={settings.timezone}
                            readOnly
                            className="input bg-gray-50"
                        />
                    </div>
                </div>
            )
        }
    ]

    return (
        <PageContainer
            title="Settings"
            subtitle="Manage your account and preferences"
            action={
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary flex items-center gap-2"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                        <Check className="w-4 h-4" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                </button>
            }
        >
            <div className="space-y-6">
                {sections.map((section, index) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm"
                    >
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <section.icon className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                        </div>
                        <div className="p-6">
                            {section.content}
                        </div>
                    </motion.div>
                ))}
            </div>
        </PageContainer>
    )
}
