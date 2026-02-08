import { useCallback, useMemo } from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'

const mapContainerStyle = {
    width: '100%',
    height: '100%'
}

const defaultCenter = {
    lat: 42.3601,
    lng: -71.0589 // Boston
}

const statusColors = {
    ringing: '#f59e0b',     // warning
    connected: '#0ea5e9',   // primary
    negotiating: '#14b8a6', // teal
    booked: '#22c55e',      // success
    no_availability: '#9ca3af', // gray
    failed: '#ef4444'       // error
}

export default function ProviderMap({ calls, userLocation }) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    })

    // Calculate map center from calls or default
    const center = useMemo(() => {
        if (userLocation) {
            return userLocation
        }

        const callsWithLocation = calls.filter(c => c.latitude && c.longitude)
        if (callsWithLocation.length === 0) {
            return defaultCenter
        }

        const avgLat = callsWithLocation.reduce((sum, c) => sum + c.latitude, 0) / callsWithLocation.length
        const avgLng = callsWithLocation.reduce((sum, c) => sum + c.longitude, 0) / callsWithLocation.length
        return { lat: avgLat, lng: avgLng }
    }, [calls, userLocation])

    const mapOptions = useMemo(() => ({
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    }), [])

    if (!isLoaded) {
        return (
            <div className="h-full bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Loading map...</p>
            </div>
        )
    }

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={12}
            options={mapOptions}
        >
            {/* User Location */}
            {userLocation && (
                <Marker
                    position={userLocation}
                    icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: '#0ea5e9',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                    }}
                />
            )}

            {/* Provider Markers */}
            {calls.map((call) => {
                if (!call.latitude || !call.longitude) return null

                const color = statusColors[call.status] || statusColors.ringing

                return (
                    <Marker
                        key={call.providerId}
                        position={{ lat: call.latitude, lng: call.longitude }}
                        icon={{
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: color,
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2
                        }}
                        title={`${call.providerName} - ${call.status}`}
                    />
                )
            })}
        </GoogleMap>
    )
}
