import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Admin() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${BASE}/analytics`)
      .then(r => r.json())
      .then(setData)
      .catch(err => setError(err.message || 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary-dark text-white shadow flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-white/90 hover:underline">← Back</Link>
        <h1 className="text-lg font-semibold">Admin Analytics</h1>
        <span className="w-12" />
      </header>
      <main className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">Total users</p>
            <p className="text-2xl font-bold text-primary">{data?.total_users ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">Crop records</p>
            <p className="text-2xl font-bold text-primary">{data?.crop_records ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">States covered</p>
            <p className="text-2xl font-bold text-primary">{data?.states_covered ?? 0}</p>
          </div>
        </div>
        {data?.top_suitable_crops?.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-gray-800 mb-2">Top suitable crops</h2>
            <ul className="space-y-1">
              {data.top_suitable_crops.map((c, i) => (
                <li key={i} className="flex justify-between">
                  <span>{c.crop}</span>
                  <span className="text-gray-600">{c.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
