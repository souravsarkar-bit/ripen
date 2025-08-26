"use client"
import { useMemo } from 'react'
import { GoogleMap, Polygon, useJsApiLoader } from '@react-google-maps/api'
import { Farm } from '@/types/farm'

type Props = { farm: Farm }

const containerStyle = { width: '100%', height: '100%' }

export default function FarmMapThumb({ farm }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined
  const { isLoaded } = useJsApiLoader({ id: 'ripen-google-maps', googleMapsApiKey: apiKey ?? '', libraries: ["places"] })

  const path = useMemo(() => {
    const coords = farm.polygon?.geometry?.coordinates?.[0]
    if (!coords) return []
    return coords.map(([lng, lat]) => ({ lat, lng }))
  }, [farm])

  if (!apiKey) {
    return <div className="w-full h-full bg-gray-100" />
  }
  if (!isLoaded) {
    return <div className="w-full h-full bg-gray-100 animate-pulse" />
  }

  const center = farm.mapCenter ?? (path[0] ?? { lat: 24.4539, lng: 54.3773 })

  return (
    <GoogleMap 
      mapContainerStyle={containerStyle} 
      center={center} 
      zoom={farm.mapCenter?.zoom ?? 12}
      options={{ disableDefaultUI: true, draggable: false, gestureHandling: 'none' }}
      onLoad={(map) => {
        if (path.length) {
          const bounds = new google.maps.LatLngBounds()
          path.forEach(p => bounds.extend(p))
          map.fitBounds(bounds, 8)
        }
      }}
    >
      {path.length > 0 && (
        <Polygon path={path} options={{ fillColor: '#22c55e', fillOpacity: 0.3, strokeColor: '#16a34a', strokeWeight: 2, clickable: false, draggable: false, editable: false }} />
      )}
    </GoogleMap>
  )
}


