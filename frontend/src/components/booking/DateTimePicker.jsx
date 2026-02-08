import { useBookingStore } from '../../stores/bookingStore'
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react'

const timePreferences = [
    { value: 'any', label: 'Any Time', icon: '🕐' },
    { value: 'morning', label: 'Morning (8AM-12PM)', icon: '🌅' },
    { value: 'afternoon', label: 'Afternoon (12PM-5PM)', icon: '☀️' },
    { value: 'evening', label: 'Evening (5PM-8PM)', icon: '🌆' }
]

const durationOptions = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
]

export default function DateTimePicker() {
    const {
        dateRangeStart,
        dateRangeEnd,
        timePreference,
        duration,
        updateField,
        nextStep,
        prevStep
    } = useBookingStore()

    // Format date for input
    const formatDateForInput = (date) => {
        if (!date) return ''
        return new Date(date).toISOString().split('T')[0]
    }

    const handleStartDate = (e) => {
        updateField('dateRangeStart', e.target.value)
    }

    const handleEndDate = (e) => {
        updateField('dateRangeEnd', e.target.value)
    }

    const canContinue = dateRangeStart && dateRangeEnd

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    When works for you?
                </h2>
                <p className="text-gray-500 mb-6">
                    Select your preferred date range and time window
                </p>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            From
                        </label>
                        <input
                            type="date"
                            value={formatDateForInput(dateRangeStart)}
                            onChange={handleStartDate}
                            min={new Date().toISOString().split('T')[0]}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            To
                        </label>
                        <input
                            type="date"
                            value={formatDateForInput(dateRangeEnd)}
                            onChange={handleEndDate}
                            min={dateRangeStart || new Date().toISOString().split('T')[0]}
                            className="input"
                        />
                    </div>
                </div>

                {/* Time Preference */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Preferred Time
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {timePreferences.map((pref) => (
                            <button
                                key={pref.value}
                                onClick={() => updateField('timePreference', pref.value)}
                                className={`p-3 rounded-xl border text-center transition-all ${timePreference === pref.value
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span className="text-xl block mb-1">{pref.icon}</span>
                                <span className={`text-xs font-medium ${timePreference === pref.value ? 'text-primary' : 'text-gray-600'
                                    }`}>
                                    {pref.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Expected Duration
                    </label>
                    <div className="flex gap-2 flex-wrap">
                        {durationOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => updateField('duration', opt.value)}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${duration === opt.value
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Calendar Preview Placeholder */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 text-center">
                        📅 Your Google Calendar events will appear here to help you pick available times
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
                <button onClick={prevStep} className="btn btn-secondary flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={nextStep}
                    disabled={!canContinue}
                    className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
