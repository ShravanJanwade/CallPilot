import { useState, useCallback } from 'react'
import { useBookingStore } from '../../stores/bookingStore'
import { ChevronLeft, ChevronRight, MapPin, Navigation } from 'lucide-react'
import { GoogleMap, useJsApiLoader, Circle, Marker } from '@react-google-maps/api'

const mapContainerStyle = {
    width: '100%',
    height: '300px',
    borderRadius: '12px'
}

const defaultCenter = {
    lat: 42.3601,
    lng: -71.0589 // Boston
}

export default function LocationPicker() {
    const {
        location,
        latitude,
        longitude,
        maxDistance,
        updateField,
        nextStep,
        prevStep
    } = useBookingStore()

    const [mapCenter, setMapCenter] = useState(
        latitude && longitude
            ? { lat: latitude, lng: longitude }
            : defaultCenter
    )

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places']
    })

    const handleLocationInput = async (e) => {
        const value = e.target.value
        updateField('location', value)
    }

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude: lat, longitude: lng } = position.coords
                    updateField('latitude', lat)
                    updateField('longitude', lng)
                    updateField('location', 'Current Location')
                    setMapCenter({ lat, lng })
                },
                (error) => {
                    console.error('Geolocation error:', error)
                }
            )
        }
    }

    const onMapClick = useCallback((e) => {
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        updateField('latitude', lat)
        updateField('longitude', lng)
        setMapCenter({ lat, lng })
    }, [updateField])

    const canContinue = location.trim().length > 0

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Where are you located?
                </h2>
                <p className="text-gray-500 mb-6">
                    We'll find providers near you
                </p>

                {/* Location Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Location
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={location}
                            onChange={handleLocationInput}
                            placeholder="Enter address or city"
                            className="input flex-1"
                        />
                        <button
                            onClick={handleUseCurrentLocation}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <Navigation className="w-4 h-4" />
                            <span className="hidden sm:inline">Current</span>
                        </button>
                    </div>
                </div>

                {/* Distance Slider */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Max Distance</span>
                        <span className="text-primary font-semibold">{maxDistance} miles</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="30"
                        value={maxDistance}
                        onChange={(e) => updateField('maxDistance', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>1 mi</span>
                        <span>30 mi</span>
                    </div>
                </div>

                {/* Map */}
                <div className="rounded-xl overflow-hidden border border-gray-200">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={mapCenter}
                            zoom={12}
                            onClick={onMapClick}
                            options={{
                                disableDefaultUI: true,
                                zoomControl: true,
                                styles: [
                                    {
                                        featureType: 'poi',
                                        elementType: 'labels',
                                        stylers: [{ visibility: 'off' }]
                                    }
                                ]
                            }}
                        >
                            {(latitude && longitude) && (
                                <>
                                    <Marker position={{ lat: latitude, lng: longitude }} />
                                    <Circle
                                        center={{ lat: latitude, lng: longitude }}
                                        radius={maxDistance * 1609.34} // miles to meters
                                        options={{
                                            fillColor: '#0ea5e9',
                                            fillOpacity: 0.1,
                                            strokeColor: '#0ea5e9',
                                            strokeOpacity: 0.3,
                                            strokeWeight: 2
                                        }}
                                    />
                                </>
                            )}
                        </GoogleMap>
                    ) : (
                        <div className="h-[300px] bg-gray-100 flex items-center justify-center">
                            <p className="text-gray-500">Loading map...</p>
                        </div>
                    )}
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
