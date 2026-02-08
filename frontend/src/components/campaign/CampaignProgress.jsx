import { useCampaignStore } from '../../stores/campaignStore'
import { Clock, Phone, CheckCircle } from 'lucide-react'

export default function CampaignProgress() {
    const { calls, activeCalls, completedCalls, status, startedAt } = useCampaignStore()

    const totalCalls = calls.length
    const progress = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0

    // Calculate elapsed time
    const getElapsedTime = () => {
        if (!startedAt) return '0:00'
        const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
        const mins = Math.floor(elapsed / 60)
        const secs = Math.floor(elapsed % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                        <Phone className={`w-4 h-4 ${activeCalls > 0 ? 'text-primary' : 'text-gray-400'}`} />
                        <span className="font-medium text-gray-700">
                            {status === 'calling' && activeCalls === 0 ? (
                                <span className="flex items-center gap-2 text-warning">
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Dialing...
                                </span>
                            ) : (
                                activeCalls > 0 ? `${activeCalls} active` : 'No active calls'
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-gray-600">
                            {completedCalls} of {totalCalls} complete
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {getElapsedTime()}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-primary to-teal transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Status Text */}
            <p className="text-xs text-gray-500 mt-2 text-center">
                {status === 'searching' && 'Searching for providers...'}
                {status === 'calling' && 'Calling providers to find you an appointment...'}
                {status === 'complete' && '✅ All calls complete — review your options below'}
                {status === 'cancelled' && '❌ Campaign cancelled'}
            </p>
        </div>
    )
}
