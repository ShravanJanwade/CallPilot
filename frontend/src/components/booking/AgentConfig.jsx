import { useState } from 'react'
import { useBookingStore } from '../../stores/bookingStore'
import { ChevronLeft, ChevronRight, Bot, ChevronDown, ChevronUp } from 'lucide-react'

export default function AgentConfig() {
    const {
        agentName,
        agentVoice,
        firstMessage,
        systemPrompt,
        userPhone,
        updateField,
        nextStep,
        prevStep
    } = useBookingStore()

    const [showAdvanced, setShowAdvanced] = useState(false)

    // Default system prompt if none set
    const defaultSystemPrompt = `You are a friendly and professional assistant calling on behalf of a patient to schedule an appointment. 

Key behaviors:
- Be polite and natural in conversation
- Ask about available times that work within the patient's preferences
- If a time is offered, use the check_calendar tool to verify it works
- If the time works, use confirm_booking to finalize
- If no times work, politely thank them and use no_availability to end the call
- Keep the conversation concise but friendly`

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Configure Your Agent
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Customize how the AI speaks on your behalf
                        </p>
                    </div>
                </div>

                {/* Agent Name */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agent Name
                    </label>
                    <input
                        type="text"
                        value={agentName}
                        onChange={(e) => updateField('agentName', e.target.value)}
                        placeholder="Alex"
                        className="input max-w-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        What the agent will call itself during the call
                    </p>
                </div>

                {/* First Message */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opening Message
                    </label>
                    <textarea
                        value={firstMessage}
                        onChange={(e) => updateField('firstMessage', e.target.value)}
                        placeholder="Hi, I'm calling on behalf of a patient to schedule an appointment..."
                        rows={3}
                        className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        The first thing the agent says when someone answers
                    </p>
                </div>

                {/* Your Phone Number */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Phone Number
                    </label>
                    <input
                        type="tel"
                        value={userPhone}
                        onChange={(e) => updateField('userPhone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="input max-w-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Used for caller ID display (optional)
                    </p>
                </div>

                {/* Advanced Settings Toggle */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mt-6 mb-4"
                >
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Advanced Settings
                </button>

                {showAdvanced && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                System Prompt
                            </label>
                            <textarea
                                value={systemPrompt || defaultSystemPrompt}
                                onChange={(e) => updateField('systemPrompt', e.target.value)}
                                rows={8}
                                className="input font-mono text-xs"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Instructions that guide the agent's behavior. Modify carefully!
                            </p>
                        </div>
                    </div>
                )}
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
