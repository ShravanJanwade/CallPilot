import { useBookingStore } from '../../stores/bookingStore'
import PreferredProviders from './PreferredProviders'
import { Search, ChevronRight } from 'lucide-react'

const serviceTypes = [
    { value: 'dentist', label: 'Dentist', emoji: '🦷' },
    { value: 'doctor', label: 'Doctor / Primary Care', emoji: '🩺' },
    { value: 'dermatologist', label: 'Dermatologist', emoji: '🧴' },
    { value: 'eye_doctor', label: 'Eye Doctor / Optometrist', emoji: '👁️' },
    { value: 'therapist', label: 'Therapist / Counselor', emoji: '🧠' },
    { value: 'chiropractor', label: 'Chiropractor', emoji: '🦴' },
    { value: 'physical_therapy', label: 'Physical Therapy', emoji: '💪' },
    { value: 'veterinarian', label: 'Veterinarian', emoji: '🐕' },
    { value: 'barber', label: 'Barber / Hair Salon', emoji: '💇' },
    { value: 'spa', label: 'Spa / Massage', emoji: '💆' },
    { value: 'mechanic', label: 'Auto Mechanic', emoji: '🚗' },
    { value: 'other', label: 'Other', emoji: '📋' }
]

export default function ServiceSelector() {
    const { serviceType, description, updateField, nextStep } = useBookingStore()

    const handleContinue = () => {
        if (serviceType) {
            nextStep()
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    What do you need?
                </h2>
                <p className="text-gray-500 mb-6">
                    Select the type of appointment you're looking for
                </p>

                {/* Service Type Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {serviceTypes.map((service) => (
                        <button
                            key={service.value}
                            onClick={() => updateField('serviceType', service.value)}
                            className={`p-4 rounded-xl border text-left transition-all ${serviceType === service.value
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <span className="text-2xl block mb-2">{service.emoji}</span>
                            <span className={`text-sm font-medium ${serviceType === service.value ? 'text-primary' : 'text-gray-700'
                                }`}>
                                {service.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Description */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description (optional)
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => updateField('description', e.target.value)}
                        placeholder="e.g., Routine cleaning, annual checkup, specific concern..."
                        rows={3}
                        className="input"
                    />
                </div>

                {/* Preferred Providers */}
                <PreferredProviders />
            </div>

            {/* Continue Button */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleContinue}
                    disabled={!serviceType}
                    className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
