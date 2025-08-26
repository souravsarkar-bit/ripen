"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, Polygon, StandaloneSearchBox, useJsApiLoader } from '@react-google-maps/api'
import { v4 as uuidv4 } from 'uuid'
import { Farm } from '@/types/farm'
import { deleteFarm, getFarmById, upsertFarm } from '@/lib/storage'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type Props = { isNew?: boolean }

const containerStyle = { width: '100%', height: '480px' }

export default function FarmEditor({ isNew }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const pathname = usePathname()
  const idFromPath = useMemo(() => {
    const parts = pathname.split('/')
    const idx = parts.indexOf('farms')
    if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'new') return parts[idx + 1]
    return undefined
  }, [pathname])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined
  const { isLoaded } = useJsApiLoader({ id: 'ripen-google-maps', googleMapsApiKey: apiKey ?? '', libraries: ["places"] })

  const existing: Farm | undefined = isNew ? undefined : (idFromPath ? getFarmById(idFromPath) : undefined)
  const [name, setName] = useState(existing?.name ?? '')
  const [country, setCountry] = useState(existing?.country ?? '')
  const [locationLabel, setLocationLabel] = useState(existing?.locationLabel ?? '')
  const [center, setCenter] = useState<{lat:number; lng:number}>(existing?.mapCenter ?? { lat: 24.4539, lng: 54.3773 })
  const [zoom, setZoom] = useState(existing?.mapCenter?.zoom ?? 12)
  const [path, setPath] = useState<google.maps.LatLngLiteral[]>(() => {
    if (existing?.polygon?.geometry?.coordinates?.[0]) {
      return existing.polygon.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
    }
    return []
  })

  const searchRef = useRef<google.maps.places.SearchBox | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const geocodeTimer = useRef<NodeJS.Timeout | null>(null)

  const onPlacesChanged = () => {
    const box = searchRef.current
    const places = box?.getPlaces()
    const place = places?.[0]
    const loc = place?.geometry?.location
    if (loc) setCenter({ lat: loc.lat(), lng: loc.lng() })
    if (place?.formatted_address) setLocationLabel(place.formatted_address)
    if (place?.address_components) {
      const countryComp = place.address_components.find(c => c.types.includes('country'))
      if (countryComp?.long_name) setCountry(countryComp.long_name)
    }
  }

  const handleSave = () => {
    if (!name.trim()) { alert('Please enter a farm name'); return }
    if (!country.trim()) { alert('Country is required (auto-filled from map search)'); return }
    // capture freshest vertices from live polygon to avoid saving stale state
    let latestPath: google.maps.LatLngLiteral[] = path
    if (polygonRef.current) {
      const livePath = polygonRef.current.getPath()
      const pts: google.maps.LatLngLiteral[] = []
      for (let i = 0; i < livePath.getLength(); i++) {
        const p = livePath.getAt(i)
        pts.push({ lat: p.lat(), lng: p.lng() })
      }
      if (pts.length) latestPath = pts
    }
    const id = existing?.id ?? uuidv4()
    // Ensure GeoJSON ring is closed (first == last)
    const ring: [number, number][] = latestPath.map(p => [p.lng, p.lat]) as [number, number][]
    if (ring.length) {
      const [lng0, lat0] = ring[0]
      const [lngN, latN] = ring[ring.length - 1]
      if (lng0 !== lngN || lat0 !== latN) ring.push([lng0, lat0])
    }
    const polygon = ring.length ? {
      type: 'Feature' as const,
      properties: { name },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [ring]
      }
    } : null
    const farm: Farm = {
      id,
      name: name || 'Untitled Farm',
      country: country || undefined,
      locationLabel: locationLabel || undefined,
      crops: [],
      primaryCrop: undefined,
      plantingDate: undefined,
      thumbnailUrl: existing?.thumbnailUrl ?? 'https://images.unsplash.com/photo-1615676809288-f8cd02d19b5f?q=80&w=800&auto=format&fit=crop',
      mapCenter: { ...center, zoom },
      centroid: latestPath.length ? centroidOf(latestPath) : null,
      polygon,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    upsertFarm(farm)
    router.push(`/`)
  }

  const polygonOptions = { editable: true, draggable: false, fillColor: '#22c55e', fillOpacity: 0.3, strokeColor: '#16a34a', strokeWeight: 2 }

  function centroidOf(points: {lat:number; lng:number}[]): {lat:number; lng:number} {
    if (!points.length) return { lat: center.lat, lng: center.lng }
    let area = 0, cx = 0, cy = 0
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const p1 = points[j], p2 = points[i]
      const f = p1.lng * p2.lat - p2.lng * p1.lat
      area += f
      cx += (p1.lng + p2.lng) * f
      cy += (p1.lat + p2.lat) * f
    }
    area *= 0.5
    if (Math.abs(area) < 1e-7) {
      // fallback to average
      const s = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
      return { lat: s.lat / points.length, lng: s.lng / points.length }
    }
    return { lat: cy / (6 * area), lng: cx / (6 * area) }
  }

  function reverseGeocode(lat: number, lng: number) {
    if (!isLoaded || !(window as any).google?.maps?.Geocoder) return
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        setLocationLabel(results[0].formatted_address)
        const countryComp = results[0].address_components?.find(c => c.types.includes('country'))
        if (countryComp?.long_name) setCountry(countryComp.long_name)
      }
    })
  }

  // When polygon changes, geocode the centroid (debounced) to update country/location
  useEffect(() => {
    if (!path.length) return
    const c = centroidOf(path)
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
    geocodeTimer.current = setTimeout(() => reverseGeocode(c.lat, c.lng), 500)
  }, [path, isLoaded])

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    setPath(p => [...p, { lat: e.latLng!.lat(), lng: e.latLng!.lng() }])
  }

  const clearPolygon = () => setPath([])

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      setZoom(Math.max(14, zoom))
      // reverse geocode my location
      if (isLoaded && (window as any).google?.maps?.Geocoder) {
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            setLocationLabel(results[0].formatted_address)
            const countryComp = results[0].address_components?.find(c => c.types.includes('country'))
            if (countryComp?.long_name) setCountry(countryComp.long_name)
          }
        })
      }
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isNew ? 'Link New Farm' : 'Edit Farm'}</h1>
          <p className="text-sm text-gray-500">Draw a single polygon to outline the farm.</p>
        </div>
        <div className="flex gap-2">
          {!isNew && existing && (
            <button
              onClick={() => {
                if (!existing) return
                const ok = confirm('Delete this farm? This cannot be undone.')
                if (!ok) return
                deleteFarm(existing.id)
                router.push('/')
              }}
              className="px-3 py-2 border rounded-md text-white bg-red-600 hover:bg-red-700 border-red-700"
            >
              Delete
            </button>
          )}
          <button onClick={clearPolygon} className="px-3 py-2 border rounded-md">Clear polygon</button>
          <button onClick={useMyLocation} className="px-3 py-2 border rounded-md">Use my location</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-md bg-emerald-600 text-white">Save</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border p-4 space-y-3 text-gray-900">
          <div>
            <label className="block text-sm font-medium text-gray-700">Farm name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-gray-900 placeholder:text-gray-400 bg-white" placeholder="Al Noor Farm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <input value={country} readOnly disabled className="mt-1 w-full border rounded-md px-3 py-2 text-gray-900 bg-gray-50" placeholder="Auto from map" title="Auto-filled from map" />
            <p className="text-xs text-gray-500 mt-1">Auto-filled from map/search.</p>
          </div>
        </div>

        <div className="lg:col-span-3">
          {!apiKey ? (
            <div className="h-[480px] rounded-xl border flex items-center justify-center bg-white">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to see the map.</div>
          ) : !isLoaded ? (
            <div className="h-[480px] rounded-xl border flex items-center justify-center bg-white">Loading map…</div>
          ) : (
            <div className="bg-white rounded-xl border p-3 space-y-3 text-gray-900">
              <StandaloneSearchBox onLoad={(ref) => { (searchRef as any).current = ref }} onPlacesChanged={onPlacesChanged}>
                <input className="w-full border rounded-md px-3 py-2 text-gray-900 placeholder:text-gray-400 bg-white" placeholder="Search location" />
              </StandaloneSearchBox>
              <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={zoom} onZoomChanged={(...args) => {}} onCenterChanged={() => {}} onClick={onMapClick} onLoad={map => { setZoom(map.getZoom() ?? 12); setCenter(map.getCenter()?.toJSON() ?? center) }} options={{ mapTypeControl: true, streetViewControl: false, fullscreenControl: true }}>
                {path.length > 0 && (
                  <Polygon 
                    path={path} 
                    options={polygonOptions} 
                    editable 
                    onLoad={(polygon) => {
                      polygonRef.current = polygon
                      const pathObj = polygon.getPath()
                      const sync = () => {
                        const pts: google.maps.LatLngLiteral[] = []
                        for (let i = 0; i < pathObj.getLength(); i++) {
                          const p = pathObj.getAt(i)
                          pts.push({ lat: p.lat(), lng: p.lng() })
                        }
                        setPath(pts)
                      }
                      pathObj.addListener('insert_at', sync)
                      pathObj.addListener('remove_at', sync)
                      pathObj.addListener('set_at', sync)
                    }}
                  />
                )}
                <Marker position={center} draggable onDragEnd={(e) => {
                  const lat = e.latLng?.lat() ?? center.lat
                  const lng = e.latLng?.lng() ?? center.lng
                  setCenter({ lat, lng })
                  reverseGeocode(lat, lng)
                }} />
              </GoogleMap>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


