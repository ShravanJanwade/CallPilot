import { Check } from 'lucide-react'

export default function Stepper({ steps, currentStep }) {
    return (
        <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => {
                const isComplete = currentStep > step.id
                const isCurrent = currentStep === step.id
                const isUpcoming = currentStep < step.id

                return (
                    <div key={step.id} className="flex items-center flex-1">
                        {/* Step Circle */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${isComplete
                                        ? 'bg-success text-white'
                                        : isCurrent
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-200 text-gray-500'
                                    }`}
                            >
                                {isComplete ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    step.id
                                )}
                            </div>
                            <span
                                className={`mt-2 text-xs font-medium ${isCurrent ? 'text-primary' : isComplete ? 'text-gray-700' : 'text-gray-400'
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>

                        {/* Connector Line */}
                        {index < steps.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 mx-2 ${isComplete ? 'bg-success' : 'bg-gray-200'
                                    }`}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
