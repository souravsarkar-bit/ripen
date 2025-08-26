"use client"
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { loadState } from '@/lib/storage'

const dummy = [
  { id: 'd1', name: 'Al Dhafra Wheat Farm', location: 'Al Dhafra, UAE', crop: 'Wheat', stats: 'Readiness 72%', thumbnailUrl: 'https://images.unsplash.com/photo-1615676809288-f8cd02d19b5f?q=80&w=800&auto=format&fit=crop' },
  { id: 'd2', name: 'Green Crescent Tomatoes', location: 'Al Ain, UAE', crop: 'Tomatoes', stats: 'Readiness 84%', thumbnailUrl: 'https://images.unsplash.com/photo-1500937386664-56ed9fbb89fb?q=80&w=800&auto=format&fit=crop' },
  { id: 'd3', name: 'Sealine Dates Estate', location: 'Liwa, UAE', crop: 'Dates', stats: 'Readiness 91%', thumbnailUrl: 'https://images.unsplash.com/photo-1516637090014-cb1ab0d08fc7?q=80&w=800&auto=format&fit=crop' },
]

export default function FarmsPage() {
  const [hasRealFarms, setHasRealFarms] = useState(false)
  useEffect(() => {
    const s = loadState()
    setHasRealFarms((s.farms?.length ?? 0) > 0)
  }, [])

  const items = useMemo(() => dummy, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Farms</h1>
          <p className="text-sm text-gray-500">Overview</p>
        </div>
        <Link href="/farms/new" className="inline-flex items-center gap-2 rounded-md bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700">Link New Farm</Link>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Link href="/farms/new" className="border-2 border-dashed rounded-xl h-40 flex items-center justify-center hover:border-emerald-400">
          <div className="text-center">
            <div className="text-3xl">＋</div>
            <div className="text-sm text-gray-500 mt-1">Link new farm</div>
          </div>
        </Link>

        {items.map(card => (
          <div key={card.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="h-28 bg-gray-100" style={{backgroundImage:`url(${card.thumbnailUrl})`, backgroundSize:'cover', backgroundPosition:'center'}} />
            <div className="p-4">
              <div className="font-medium">{card.name}</div>
              <div className="text-xs text-gray-500">{card.location} • {card.crop}</div>
              <div className="mt-2 text-sm text-emerald-700">{card.stats}</div>
            </div>
          </div>
        ))}
      </div>

      {hasRealFarms && (
        <div className="mt-10">
          <h2 className="text-lg font-medium mb-3">Your linked farms</h2>
          <RealFarmsList />
        </div>
      )}
    </div>
  )
}

function RealFarmsList() {
  const [farms, setFarms] = useState(loadState().farms)
  useEffect(() => { setFarms(loadState().farms) }, [])
  if (!farms.length) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {farms.map(f => (
        <Link href={`/farms/${f.id}/edit`} key={f.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:ring-1 hover:ring-emerald-400">
          <div className="h-28 bg-gray-100" style={{backgroundImage:`url(${f.thumbnailUrl ?? 'https://images.unsplash.com/photo-1615676809288-f8cd02d19b5f?q=80&w=800&auto=format&fit=crop'})`, backgroundSize:'cover', backgroundPosition:'center'}} />
          <div className="p-4">
            <div className="font-medium">{f.name}</div>
            <div className="text-xs text-gray-500">{f.country ?? 'Unknown country'}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}
