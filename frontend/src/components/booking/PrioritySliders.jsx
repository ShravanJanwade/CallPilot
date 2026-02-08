import { useBookingStore } from '../../stores/bookingStore'
import { ChevronLeft, ChevronRight, Sliders } from 'lucide-react'

export default function PrioritySliders() {
    const {
        weightAvailability,
        weightRating,
        weightDistance,
        weightPreference,
        maxProviders,
        preferredProviders,
        updateField,
        nextStep,
        prevStep
    } = useBookingStore()

    const sliders = [
        {
            key: 'weightAvailability',
            label: 'Earliest Availability',
            emoji: '⏰',
            value: weightAvailability,
            description: 'Prioritize soonest available appointments'
        },
        {
            key: 'weightRating',
            label: 'Provider Rating',
            emoji: '⭐',
            value: weightRating,
            description: 'Prioritize highest-rated providers'
        },
        {
            key: 'weightDistance',
            label: 'Closest Distance',
            emoji: '📍',
            value: weightDistance,
            description: 'Prioritize nearest providers'
        },
        {
            key: 'weightPreference',
            label: 'Personal Preference',
            emoji: '❤️',
            value: weightPreference,
            description: preferredProviders.length > 0
                ? `Boost your ${preferredProviders.length} preferred provider(s)`
                : 'Add preferred providers in Step 1 to use this'
        }
    ]

    const total = weightAvailability + weightRating + weightDistance + weightPreference

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Set your priorities
                </h2>
                <p className="text-gray-500 mb-6">
                    Adjust how we rank providers based on what matters most to you
                </p>

                {/* Priority Sliders */}
                <div className="space-y-6 mb-8">
                    {sliders.map((slider) => (
                        <div key={slider.key}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{slider.emoji}</span>
                                    <span className="font-medium text-gray-800">{slider.label}</span>
                                </div>
                                <span className="text-lg font-semibold text-primary">{slider.value}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={slider.value}
                                onChange={(e) => updateField(slider.key, parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <p className="text-xs text-gray-500 mt-1">{slider.description}</p>
                        </div>
                    ))}
                </div>

                {/* Total Indicator */}
                <div className={`p-4 rounded-xl ${total === 100 ? 'bg-success/10 border border-success/30' : 'bg-warning/10 border border-warning/30'
                    }`}>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Total Weight</span>
                        <span className={`font-bold ${total === 100 ? 'text-success' : 'text-warning'}`}>
                            {total}%
                        </span>
                    </div>
                    {total !== 100 && (
                        <p className="text-xs text-warning mt-1">
                            Weights should add up to 100% for balanced scoring
                        </p>
                    )}
                </div>

                {/* Max Providers */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="font-medium text-gray-800">Max Providers to Call</span>
                            <p className="text-xs text-gray-500">How many providers should we contact?</p>
                        </div>
                        <span className="text-lg font-semibold text-primary">{maxProviders}</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="15"
                        value={maxProviders}
                        onChange={(e) => updateField('maxProviders', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>1 provider</span>
                        <span>15 providers</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
                <button onClick={prevStep} className="btn btn-secondary flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <button onClick={nextStep} className="btn btn-primary flex items-center gap-2">
                    Continue
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
