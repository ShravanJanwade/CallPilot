import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../stores/campaignStore'
import PageContainer from '../components/layout/PageContainer'
import CallCard from '../components/campaign/CallCard'
import ResultsList from '../components/campaign/ResultsList'
import CampaignProgress from '../components/campaign/CampaignProgress'
import ProviderMap from '../components/campaign/ProviderMap'
import useWebSocket from '../hooks/useWebSocket'
import { XCircle } from 'lucide-react'

export default function CampaignLive() {
    const { id } = useParams()
    const navigate = useNavigate()
    const {
        calls,
        status,
        rankedResults,
        bestMatch,
        cancelCampaign,
        confirmBooking,
        reset
    } = useCampaignStore()

    // Connect WebSocket
    const { isConnected } = useWebSocket(id)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Don't reset if navigating to confirmation
        }
    }, [])

    const handleCancel = async () => {
        await cancelCampaign()
        navigate('/dashboard')
    }

    const handleConfirm = async (providerId) => {
        try {
            const result = await confirmBooking(providerId)
            navigate(`/booking/${result.booking_id}`)
        } catch (error) {
            console.error('Confirm error:', error)
        }
    }

    return (
        <PageContainer
            title="Live Campaign"
            subtitle={status === 'complete' ? 'All calls complete — review your options' : 'Calling providers to find you an appointment'}
            action={
                status !== 'complete' && status !== 'cancelled' && (
                    <button
                        onClick={handleCancel}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <XCircle className="w-4 h-4" />
                        Cancel Campaign
                    </button>
                )
            }
        >
            {/* Progress Bar */}
            <CampaignProgress />

            {/* Main Content - Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                {/* Left: Call Feed */}
                <div className="lg:col-span-3 space-y-4">
                    <h3 className="font-semibold text-gray-900">Call Activity</h3>

                    {calls.length === 0 ? (
                        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <span className="w-3 h-3 bg-primary rounded-full" />
                            </div>
                            <p className="text-gray-500">Searching for providers...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {calls.map((call) => (
                                <CallCard key={call.providerId} call={call} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Map & Results */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Map */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="h-64">
                            <ProviderMap calls={calls} />
                        </div>
                    </div>

                    {/* Results */}
                    {status === 'complete' && rankedResults.length > 0 && (
                        <ResultsList
                            results={rankedResults}
                            bestMatch={bestMatch}
                            onConfirm={handleConfirm}
                        />
                    )}
                </div>
            </div>

            {/* Connection Status */}
            <div className="fixed bottom-4 right-4">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium ${isConnected ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                    {isConnected ? 'Live' : 'Connecting...'}
                </div>
            </div>
        </PageContainer>
    )
}
