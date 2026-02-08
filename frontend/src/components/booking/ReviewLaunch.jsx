import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '../../stores/bookingStore'
import { useCampaignStore } from '../../stores/campaignStore'
import { useAuthStore } from '../../stores/authStore'
import {
    ChevronLeft,
    Rocket,
    Calendar,
    MapPin,
    Sliders,
    Bot,
    Building,
    Loader2,
    Phone
} from 'lucide-react'

export default function ReviewLaunch() {
    const navigate = useNavigate()
    const { token } = useAuthStore()
    const { setCampaign } = useCampaignStore()
    const booking = useBookingStore()
    const [launching, setLaunching] = useState(false)
    const [error, setError] = useState(null)

    const handleLaunch = async () => {
        setLaunching(true)
        setError(null)

        try {
            const formData = booking.getFormData()

            const response = await fetch('http://localhost:8080/api/campaign/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                throw new Error('Failed to start campaign')
            }

            const data = await response.json()
            setCampaign(data.campaign_id)
            navigate(`/campaign/${data.campaign_id}`)
        } catch (err) {
            setError(err.message)
            setLaunching(false)
        }
    }

    const summaryItems = [
        {
            icon: Building,
            label: 'Service',
            value: booking.serviceType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
        },
        {
            icon: Calendar,
            label: 'Dates',
            value: booking.dateRangeStart && booking.dateRangeEnd
                ? `${new Date(booking.dateRangeStart).toLocaleDateString()} – ${new Date(booking.dateRangeEnd).toLocaleDateString()}`
                : 'Not set'
        },
        {
            icon: MapPin,
            label: 'Location',
            value: `${booking.location} (within ${booking.maxDistance} mi)`
        },
        {
            icon: Sliders,
            label: 'Priorities',
            value: `Availability ${booking.weightAvailability}%, Rating ${booking.weightRating}%, Distance ${booking.weightDistance}%`
        },
        {
            icon: Phone,
            label: 'Max Providers',
            value: `Up to ${booking.maxProviders} providers`
        },
        {
            icon: Bot,
            label: 'Agent',
            value: booking.agentName || 'Alex'
        }
    ]

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Review & Launch
                </h2>
                <p className="text-gray-500 mb-6">
                    Make sure everything looks good before starting
                </p>

                <div className="space-y-4 mb-6">
                    {summaryItems.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <item.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                <p className="text-sm text-gray-600">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {booking.preferredProviders.length > 0 && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 mb-6">
                        <p className="text-sm font-medium text-primary mb-2">
                            🌟 Preferred Providers (will be called first)
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {booking.preferredProviders.map((p, i) => (
                                <span key={i} className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border">
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-800 mb-2">What happens next?</p>
                    <ol className="text-sm text-gray-600 space-y-1">
                        <li>1. We'll search for {booking.maxProviders} providers matching your criteria</li>
                        <li>2. Our AI agent will call them simultaneously</li>
                        <li>3. You'll see live transcripts as calls progress</li>
                        <li>4. We'll find and book the best matching appointment</li>
                    </ol>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-error/10 border border-error/30 rounded-xl">
                        <p className="text-sm text-error">{error}</p>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-between">
                <button
                    onClick={booking.prevStep}
                    disabled={launching}
                    className="btn btn-secondary flex items-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={handleLaunch}
                    disabled={launching}
                    className="btn btn-success flex items-center gap-2 px-8 disabled:opacity-50"
                >
                    {launching ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Launching...
                        </>
                    ) : (
                        <>
                            <Rocket className="w-4 h-4" />
                            Start Calling
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
