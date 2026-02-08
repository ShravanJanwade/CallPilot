import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageContainer from '../components/layout/PageContainer'
import { CheckCircle, Calendar, MapPin, Clock, ExternalLink, Navigation } from 'lucide-react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

export default function BookingConfirmation() {
    const { id } = useParams()
    const [booking, setBooking] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchBooking()
        // Trigger confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        })
    }, [id])

    const fetchBooking = async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/booking/${id}`)
            if (response.ok) {
                const data = await response.json()
                setBooking(data)
            }
        } catch (error) {
            console.error('Fetch booking error:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-96">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </PageContainer>
        )
    }

    // Fallback data for demo
    const displayBooking = booking || {
        provider_name: 'Downtown Dental Care',
        service: 'Dental Cleaning',
        date: '2025-02-15',
        time: '10:00 AM',
        address: '123 Main St, Boston, MA 02101',
        calendar_event_url: 'https://calendar.google.com',
        rating: 4.8
    }

    return (
        <PageContainer>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto"
            >
                {/* Success Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                        <CheckCircle className="w-10 h-10 text-success" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Appointment Booked!
                    </h1>
                    <p className="text-gray-600">
                        Your appointment has been confirmed and added to your calendar
                    </p>
                </div>

                {/* Booking Details Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {displayBooking.provider_name}
                                </h2>
                                <p className="text-gray-500 mt-1">{displayBooking.service}</p>
                            </div>
                            <span className="badge badge-success">Confirmed</span>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Date & Time */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{displayBooking.date}</p>
                                <p className="text-sm text-gray-500">{displayBooking.time}</p>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-teal" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{displayBooking.address}</p>
                                <p className="text-sm text-gray-500">
                                    {displayBooking.distance_miles ? `${displayBooking.distance_miles} miles away` : 'View directions'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
                        <a
                            href={displayBooking.calendar_event_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary w-full flex items-center justify-center gap-2"
                        >
                            <Calendar className="w-4 h-4" />
                            View in Google Calendar
                            <ExternalLink className="w-4 h-4" />
                        </a>

                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(displayBooking.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary w-full flex items-center justify-center gap-2"
                        >
                            <Navigation className="w-4 h-4" />
                            Get Directions
                        </a>
                    </div>
                </div>

                {/* Back to Dashboard */}
                <div className="text-center mt-8">
                    <Link
                        to="/dashboard"
                        className="text-primary font-medium hover:underline"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>
            </motion.div>
        </PageContainer>
    )
}
