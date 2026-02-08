import { useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF } from '@react-google-maps/api'
import { Star, MapPin, Phone } from 'lucide-react'

const LIBS = ['places']
const STATUS_COLORS = {
    queued: '#94A3B8', ringing: '#F59E0B', connected: '#3B82F6',
    negotiating: '#8B5CF6', booked: '#22C55E', no_availability: '#EF4444',
    failed: '#6B7280', skipped: '#CBD5E1', completed: '#64748B',
}

const mapStyles = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

export default function ProviderMap({ providers = [], origin, radiusMiles = 10, height = '100%' }) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBS,
    })
    const [selected, setSelected] = useState(null)

    const center = origin || { lat: 42.3601, lng: -71.0589 }

    const onLoad = useCallback((map) => {
        if (providers.length > 0) {
            const bounds = new window.google.maps.LatLngBounds()
            bounds.extend(center)
            providers.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))
            map.fitBounds(bounds, 50)
        }
    }, [providers, center])

    if (!isLoaded) {
        return <div className="bg-slate-100 rounded-2xl animate-pulse" style={{ height }} />
    }

    return (
        <GoogleMap
            center={center} zoom={12}
            mapContainerStyle={{ width: '100%', height, borderRadius: '1rem' }}
            options={{ disableDefaultUI: true, zoomControl: true, styles: mapStyles }}
            onLoad={onLoad}
        >
            <CircleF
                center={center} radius={radiusMiles * 1609.34}
                options={{ fillColor: '#0EA5E9', fillOpacity: 0.04, strokeColor: '#0EA5E9', strokeOpacity: 0.2, strokeWeight: 1 }}
            />

            {/* User location */}
            <MarkerF position={center} icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#0EA5E9', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3, scale: 8,
            }} />

            {/* Provider markers */}
            {providers.map(p => (
                <MarkerF
                    key={p.provider_id || p.place_id}
                    position={{ lat: p.lat, lng: p.lng }}
                    onClick={() => setSelected(p)}
                    icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: STATUS_COLORS[p.status] || '#94A3B8',
                        fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 10,
                    }}
                />
            ))}

            {selected && (
                <InfoWindowF position={{ lat: selected.lat, lng: selected.lng }} onCloseClick={() => setSelected(null)}>
                    <div className="p-1 min-w-[180px]">
                        <p className="font-semibold text-sm text-slate-800">{selected.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            {selected.rating > 0 && (
                                <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{selected.rating}</span>
                            )}
                            {selected.distance_miles < 999 && (
                                <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{selected.distance_miles}mi</span>
                            )}
                        </div>
                        {selected.phone && (
                            <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                <Phone className="w-3 h-3" />{selected.phone}
                            </p>
                        )}
                        {selected.status === 'booked' && selected.slot && (
                            <p className="text-xs text-emerald-600 font-medium mt-1">
                                ✓ {selected.slot.date} at {selected.slot.time}
                            </p>
                        )}
                    </div>
                </InfoWindowF>
            )}
        </GoogleMap>
    )
}
