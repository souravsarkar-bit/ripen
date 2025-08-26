"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, LoadScript, Marker, Polygon, StandaloneSearchBox } from '@react-google-maps/api'
import { v4 as uuidv4 } from 'uuid'
import { Farm } from '@/types/farm'
import { getFarmById, upsertFarm } from '@/lib/storage'
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

  const [apiKey, setApiKey] = useState<string | undefined>(undefined)
  useEffect(() => { setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) }, [])

  const existing: Farm | undefined = isNew ? undefined : (idFromPath ? getFarmById(idFromPath) : undefined)
  const [name, setName] = useState(existing?.name ?? '')
  const [country, setCountry] = useState(existing?.country ?? '')
  const [center, setCenter] = useState<{lat:number; lng:number}>(existing?.mapCenter ?? { lat: 24.4539, lng: 54.3773 })
  const [zoom, setZoom] = useState(existing?.mapCenter?.zoom ?? 12)
  const [path, setPath] = useState<google.maps.LatLngLiteral[]>(() => {
    if (existing?.polygon?.geometry?.coordinates?.[0]) {
      return existing.polygon.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
    }
    return []
  })

  const searchRef = useRef<StandaloneSearchBox>(null)

  const onPlacesChanged = () => {
    const box = searchRef.current
    const places = box?.getPlaces()
    const place = places?.[0]
    const loc = place?.geometry?.location
    if (loc) setCenter({ lat: loc.lat(), lng: loc.lng() })
  }

  const handleSave = () => {
    const id = existing?.id ?? uuidv4()
    const polygon = path.length ? {
      type: 'Feature' as const,
      properties: { name },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [path.map(p => [p.lng, p.lat])]
      }
    } : null
    const farm: Farm = {
      id,
      name: name || 'Untitled Farm',
      country: country || undefined,
      crops: [],
      primaryCrop: undefined,
      plantingDate: undefined,
      thumbnailUrl: existing?.thumbnailUrl ?? 'https://images.unsplash.com/photo-1615676809288-f8cd02d19b5f?q=80&w=800&auto=format&fit=crop',
      mapCenter: { ...center, zoom },
      polygon,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    upsertFarm(farm)
    router.push(`/`)
  }

  const polygonOptions = { editable: true, draggable: false, fillColor: '#22c55e', fillOpacity: 0.3, strokeColor: '#16a34a', strokeWeight: 2 }

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
          <button onClick={clearPolygon} className="px-3 py-2 border rounded-md">Clear polygon</button>
          <button onClick={useMyLocation} className="px-3 py-2 border rounded-md">Use my location</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-md bg-emerald-600 text-white">Save</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Farm name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" placeholder="Al Noor Farm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Country</label>
            <input value={country} onChange={e => setCountry(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" placeholder="United Arab Emirates" />
          </div>
        </div>

        <div className="lg:col-span-3">
          {!apiKey ? (
            <div className="h-[480px] rounded-xl border flex items-center justify-center bg-white">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to see the map.</div>
          ) : (
            <LoadScript googleMapsApiKey={apiKey} libraries={["places"]}>
              <div className="bg-white rounded-xl border p-3 space-y-3">
                <StandaloneSearchBox onLoad={(ref) => { (searchRef as any).current = ref }} onPlacesChanged={onPlacesChanged}>
                  <input className="w-full border rounded-md px-3 py-2" placeholder="Search location" />
                </StandaloneSearchBox>
                <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={zoom} onZoomChanged={(...args) => {}} onCenterChanged={() => {}} onClick={onMapClick} onLoad={map => { setZoom(map.getZoom() ?? 12); setCenter(map.getCenter()?.toJSON() ?? center) }}>
                  {path.length > 0 && (
                    <Polygon 
                      path={path} 
                      options={polygonOptions} 
                      editable 
                      onLoad={(polygon) => {
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
                  <Marker position={center} />
                </GoogleMap>
              </div>
            </LoadScript>
          )}
        </div>
      </div>
    </div>
  )
}


