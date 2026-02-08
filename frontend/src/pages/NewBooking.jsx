import { useBookingStore } from '../stores/bookingStore'
import PageContainer from '../components/layout/PageContainer'
import Stepper from '../components/common/Stepper'
import ServiceSelector from '../components/booking/ServiceSelector'
import DateTimePicker from '../components/booking/DateTimePicker'
import LocationPicker from '../components/booking/LocationPicker'
import PrioritySliders from '../components/booking/PrioritySliders'
import AgentConfig from '../components/booking/AgentConfig'
import ReviewLaunch from '../components/booking/ReviewLaunch'
import { motion, AnimatePresence } from 'framer-motion'

const steps = [
    { id: 1, label: 'Service' },
    { id: 2, label: 'Schedule' },
    { id: 3, label: 'Location' },
    { id: 4, label: 'Priorities' },
    { id: 5, label: 'Agent' },
    { id: 6, label: 'Review' },
]

export default function NewBooking() {
    const { currentStep } = useBookingStore()

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <ServiceSelector />
            case 2:
                return <DateTimePicker />
            case 3:
                return <LocationPicker />
            case 4:
                return <PrioritySliders />
            case 5:
                return <AgentConfig />
            case 6:
                return <ReviewLaunch />
            default:
                return <ServiceSelector />
        }
    }

    return (
        <PageContainer
            title="Book an Appointment"
            subtitle="Let our AI find and book the perfect appointment for you"
        >
            {/* Stepper */}
            <Stepper steps={steps} currentStep={currentStep} />

            {/* Step Content */}
            <div className="mt-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </PageContainer>
    )
}
