"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadState } from '@/lib/storage'
import type { Farm } from '@/types/farm'
import FarmMapThumb from '../components/FarmMapThumb'

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setFarms(loadState().farms); setMounted(true) }, [])

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

        {mounted && farms.map(f => (
          <Link href={`/farms/${f.id}/edit`} key={f.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:ring-1 hover:ring-emerald-400">
            <div className="h-28 bg-gray-100">
              <FarmMapThumb farm={f} />
            </div>
            <div className="p-4">
              <div className="font-medium">{f.name}</div>
              <div className="text-xs text-gray-500">{f.country ?? 'Unknown country'}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
