import { useState, useCallback } from 'react'
import { useBookingStore } from '../../stores/bookingStore'
import { ChevronLeft, ChevronRight, MapPin, Navigation, Map, AlertCircle } from 'lucide-react'
import { GoogleMap, useJsApiLoader, Circle, Marker } from '@react-google-maps/api'
import { motion } from 'framer-motion'

const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '16px' }
const defaultCenter = { lat: 42.3601, lng: -71.0589 }

const libraries = ['places']

export default function LocationPicker() {
    const { location, latitude, longitude, maxDistance, updateField, nextStep, prevStep } = useBookingStore()
    const [mapCenter, setMapCenter] = useState(latitude && longitude ? { lat: latitude, lng: longitude } : defaultCenter)
    const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '', libraries: ['places'] })

    const handleLocationInput = (e) => updateField('location', e.target.value)
    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude: lat, longitude: lng } = position.coords
                updateField('latitude', lat); updateField('longitude', lng); updateField('location', 'Current Location'); setMapCenter({ lat, lng })
            }, console.error)
        }
    }
    const onMapClick = useCallback((e) => { const lat = e.latLng.lat(); const lng = e.latLng.lng(); updateField('latitude', lat); updateField('longitude', lng); setMapCenter({ lat, lng }) }, [updateField])
    const canContinue = location.trim().length > 0

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal flex items-center justify-center"><MapPin className="w-5 h-5 text-white" /></div>
                    <h2 className="text-2xl font-bold text-gray-900">Where are you located?</h2>
                </div>
                <p className="text-gray-600 mb-8">We'll find providers near you</p>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Your Location</label>
                    <div className="flex gap-3">
                        <input type="text" value={location} onChange={handleLocationInput} placeholder="Enter address or city" className="input flex-1" />
                        <button onClick={handleUseCurrentLocation} className="btn btn-secondary flex items-center gap-2"><Navigation className="w-4 h-4" /><span className="hidden sm:inline">Current</span></button>
                    </div>
                </div>
                <div className="mb-8">
                    <div className="flex justify-between text-sm mb-3"><span className="font-medium text-gray-700">Max Distance</span><span className="text-primary font-bold text-lg">{maxDistance} miles</span></div>
                    <input type="range" min="1" max="30" value={maxDistance} onChange={(e) => updateField('maxDistance', parseInt(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-gray-500 mt-2"><span>1 mile</span><span>30 miles</span></div>
                </div>
                <div className="map-container relative">
                    {loadError ? (<div className="h-[350px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center border border-gray-200"><AlertCircle className="w-8 h-8 text-red-500 mb-4" /><p className="text-gray-600">Unable to load map</p></div>
                    ) : isLoaded ? (
                        <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={12} onClick={onMapClick} options={{ disableDefaultUI: true, zoomControl: true }}>
                            {(latitude && longitude) && (<><Marker position={{ lat: latitude, lng: longitude }} /><Circle center={{ lat: latitude, lng: longitude }} radius={maxDistance * 1609.34} options={{ fillColor: '#0ea5e9', fillOpacity: 0.1, strokeColor: '#0ea5e9', strokeOpacity: 0.5, strokeWeight: 2 }} /></>)}
                        </GoogleMap>
                    ) : (<div className="h-[350px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center"><Map className="w-8 h-8 text-primary mb-4 animate-pulse" /><p className="text-gray-600">Loading map...</p></div>)}
                </div>
            </div>
            <div className="mt-8 flex justify-between">
                <button onClick={prevStep} className="btn btn-secondary flex items-center gap-2"><ChevronLeft className="w-4 h-4" />Back</button>
                <button onClick={nextStep} disabled={!canContinue} className="btn btn-primary flex items-center gap-2 disabled:opacity-50">Continue<ChevronRight className="w-4 h-4" /></button>
            </div>
        </motion.div>
    )
}
