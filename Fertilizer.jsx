import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fertilizerRecommend } from '../api'

export default function Fertilizer() {
  const [cropName, setCropName] = useState('Rice')
  const [soilType, setSoilType] = useState('alluvial')
  const [soilPh, setSoilPh] = useState('')
  const [acreage, setAcreage] = useState('1')
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
      const data = await fertilizerRecommend({
        cropName: cropName.trim(),
        soilType: soilType.trim() || 'alluvial',
        soilPh: soilPh ? parseFloat(soilPh) : undefined,
        acreage: parseFloat(acreage) || 1,
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
        <h1 className="text-lg font-semibold">Fertilizer Recommendation</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Soil type</label>
            <input
              type="text"
              value={soilType}
              onChange={e => setSoilType(e.target.value)}
              placeholder="alluvial, red, black, sandy"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Soil pH (optional)</label>
            <input
              type="text"
              value={soilPh}
              onChange={e => setSoilPh(e.target.value)}
              placeholder="e.g. 6.5"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acreage</label>
            <input
              type="text"
              value={acreage}
              onChange={e => setAcreage(e.target.value)}
              placeholder="1"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Get NPK Recommendation'}
          </button>
        </form>
        {result && (
          <div className="mt-6 bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-gray-800 mb-2">NPK (kg/acre)</h2>
            {result.npk_kg_per_acre && (
              <p className="text-lg">N: {result.npk_kg_per_acre.N}  P: {result.npk_kg_per_acre.P}  K: {result.npk_kg_per_acre.K}</p>
            )}
            {result.application_schedule && (
              <p className="mt-2 text-sm text-gray-600">Schedule: {result.application_schedule}</p>
            )}
            {result.products?.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {result.products.map((p, i) => <li key={i}>• {p}</li>)}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
