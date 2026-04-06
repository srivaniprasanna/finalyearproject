import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cropCheck } from '../api'

function fmtNum(v) {
  if (v == null) return '—'
  if (typeof v === 'number') return v.toFixed(Number.isInteger(v) ? 0 : 1)
  return String(v)
}

export default function BestCrops() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(null)
  const [visibleCount, setVisibleCount] = useState(4)
  const [selectedCrop, setSelectedCrop] = useState(null)
  if (!state) {
    navigate('/')
    return null
  }
  const {
    crops,
    crop_explanations,
    season,
    season_description,
    location_data,
    locationName,
    lat,
    lon,
    state: regionState,
    district
  } = state

  useEffect(() => {
    if (!selectedCrop && Array.isArray(crops) && crops.length > 0) {
      setSelectedCrop(crops[0])
    }
  }, [crops, selectedCrop])

  async function handleCropTap(crop) {
    if (!lat || !lon) return
    setChecking(crop)
    try {
      const data = await cropCheck({ cropName: crop, lat, lon, state: regionState || undefined, district: district || undefined })
      navigate('/result', { state: { ...data, locationName } })
    } catch (err) {
      setChecking(null)
    }
  }

  return (
    <div className="min-h-screen bg-farming">
      <header className="bg-primary text-white shadow px-4 py-3">
        <button onClick={() => navigate('/')} className="text-white/90 hover:underline">← Back</button>
        <h1 className="text-lg font-semibold mt-1">Best crops for your location</h1>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-6">
        {locationName && (
          <div className="bg-white/90 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-800">📍 {locationName}</p>
          </div>
        )}
        <div className="bg-green-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">☀️</span>
            <h2 className="font-semibold text-gray-800">Current season: {season}</h2>
          </div>
          <p className="text-sm text-gray-700">{season_description}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-800 mb-2">Your location conditions</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>Temperature: {fmtNum(location_data?.temperature_c)}°C</li>
            <li>Rainfall (est.): {fmtNum(location_data?.rainfall_mm)} mm</li>
            <li>Humidity: {location_data?.humidity_percent ?? '—'}%</li>
            <li>Soil type: {location_data?.soil_type ?? '—'}</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-gray-800 mb-2">Recommended crops to cultivate</h2>
          {!crops?.length ? (
            <p className="text-gray-600 text-sm">No specific recommendations for this location.</p>
          ) : (
            <div>
              <div className="flex flex-wrap gap-2">
                {crops.slice(0, visibleCount).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCrop(c)}
                    className={
                      c === selectedCrop
                        ? 'bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark'
                        : 'bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200'
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>

              {crops.length > visibleCount && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((v) => Math.min(v + 4, crops.length))}
                    className="w-full bg-white border border-gray-200 text-gray-800 font-medium py-2 rounded-lg hover:bg-gray-50"
                  >
                    Show more
                  </button>
                </div>
              )}

              {selectedCrop && crop_explanations?.[selectedCrop] && (
                <div className="bg-white rounded-xl shadow p-4 mt-4 border border-gray-100">
                  <h3 className="font-semibold text-gray-800 mb-2">Why {selectedCrop} is recommended</h3>
                  <div className="space-y-3">
                    {crop_explanations[selectedCrop].map((r, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-gray-800">{r.title}</p>
                          <p className={`text-xs font-semibold ${r.suitable ? 'text-green-700' : 'text-amber-700'}`}>
                            {r.suitable ? 'Match' : 'Less ideal'}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{r.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Required: {r.required} | Your location: {r.actual}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCropTap(selectedCrop)}
                    disabled={checking != null}
                    className="mt-4 w-full bg-primary-dark text-white font-medium py-2 rounded-lg disabled:opacity-50"
                  >
                    {checking === selectedCrop ? 'Checking…' : 'View full suitability details'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
