import { useState } from 'react'
import { Link } from 'react-router-dom'
import { irrigationRecommend } from '../api'

export default function Irrigation() {
  const [cropName, setCropName] = useState('Rice')
  const [rainfallMm, setRainfallMm] = useState('800')
  const [soilType, setSoilType] = useState('alluvial')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!cropName.trim()) {
      setError('Enter crop name')
      return
    }
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await irrigationRecommend({
        cropName: cropName.trim(),
        rainfallMm: parseFloat(rainfallMm) || 800,
        soilType: soilType.trim() || 'alluvial',
      })
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-farming">
      <header className="bg-primary-dark text-white shadow flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-white/90 hover:underline">← Back</Link>
        <h1 className="text-lg font-semibold">Irrigation Advisor</h1>
        <span className="w-12" />
      </header>
      <main className="p-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crop name</label>
            <input
              type="text"
              value={cropName}
              onChange={e => setCropName(e.target.value)}
              placeholder="e.g. Rice, Wheat, Cotton"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rainfall received (mm)</label>
            <input
              type="text"
              value={rainfallMm}
              onChange={e => setRainfallMm(e.target.value)}
              placeholder="800"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Soil type</label>
            <input
              type="text"
              value={soilType}
              onChange={e => setSoilType(e.target.value)}
              placeholder="alluvial, red, black, sandy"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Get Irrigation Schedule'}
          </button>
        </form>
        {result && (
          <div className="mt-6 bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-gray-800 mb-2">Recommendation</h2>
            {result.recommended_irrigation_mm != null && (
              <p>Irrigation: {result.recommended_irrigation_mm} mm every {result.interval_days} days</p>
            )}
            {result.critical_stages?.length > 0 && (
              <p className="mt-1 text-sm">Critical stages: {result.critical_stages.join(', ')}</p>
            )}
            {result.advice && <p className="mt-2 text-sm text-gray-600">{result.advice}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
