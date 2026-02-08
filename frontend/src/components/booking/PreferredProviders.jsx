import { useState } from 'react'
import { useBookingStore } from '../../stores/bookingStore'
import { Plus, X, Phone, Building } from 'lucide-react'

export default function PreferredProviders() {
    const { preferredProviders, addPreferredProvider, removePreferredProvider } = useBookingStore()
    const [showForm, setShowForm] = useState(false)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')

    const handleAdd = () => {
        if (name.trim() && phone.trim()) {
            addPreferredProvider({ name: name.trim(), phone: phone.trim() })
            setName('')
            setPhone('')
            setShowForm(false)
        }
    }

    return (
        <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-medium text-gray-900">Preferred Providers</h3>
                    <p className="text-sm text-gray-500">
                        Have a preferred place? We'll try them first.
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn btn-ghost text-primary"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                    </button>
                )}
            </div>

            {/* Provider List */}
            {preferredProviders.length > 0 && (
                <div className="space-y-2 mb-4">
                    {preferredProviders.map((provider, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Building className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">{provider.name}</p>
                                    <p className="text-xs text-gray-500">{provider.phone}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => removePreferredProvider(index)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Form */}
            {showForm && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Provider name"
                        className="input"
                    />
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone number"
                        className="input"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleAdd}
                            disabled={!name.trim() || !phone.trim()}
                            className="btn btn-primary flex-1 disabled:opacity-50"
                        >
                            Add Provider
                        </button>
                        <button
                            onClick={() => { setShowForm(false); setName(''); setPhone(''); }}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
