import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cropCheck, bestCrops, reverseGeocode } from '../api'

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [locationAllowed, setLocationAllowed] = useState(false)
  const [lat, setLat] = useState(null)
  const [lon, setLon] = useState(null)

  const [locationName, setLocationName] = useState('')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')

  const [cropName, setCropName] = useState('')
  const [error, setError] = useState('')

  const [checking, setChecking] = useState(false)
  const [loadingBest, setLoadingBest] = useState(false)

  // This array is kept for the "Tap a crop" UI, but we do not auto-fetch it.
  // It will remain empty until you explicitly fetch from the Best Crops page.
  const [bestCropsFromApi, setBestCropsFromApi] = useState([])

  // -----------------------------------
  // GET USER LOCATION
  // -----------------------------------

  useEffect(() => {

    if (!navigator.geolocation) {
      setLocationAllowed(false)
      return
    }

    navigator.geolocation.getCurrentPosition(

      async (pos) => {

        const latitude = pos.coords.latitude
        const longitude = pos.coords.longitude

        console.log("Latitude:", latitude)
        console.log("Longitude:", longitude)

        setLat(latitude)
        setLon(longitude)
        setLocationAllowed(true)

        try {

          const data = await reverseGeocode({
            lat: latitude,
            lon: longitude
          })

          if (data?.display_name) {
            setLocationName(data.display_name)
          }

        } catch (err) {
          console.log("Reverse geocode error:", err)
        }
      },

      (error) => {
        console.log("Location error:", error)
        setLocationAllowed(false)
      },

      { enableHighAccuracy: true }

    )

  }, [])

  // -----------------------------------
  // GET BEST CROPS BUTTON
  // -----------------------------------

  async function handleBestCrops() {

    if (lat === null || lon === null) {
      setError('Allow location first to get best crops.')
      return
    }

    setError('')
    setLoadingBest(true)

    try {

      const data = await bestCrops({
        lat,
        lon,
        state: state || undefined,
        district: district || undefined,
        includeExplanations: true
      })

      navigate('/best-crops', {
        state: { ...data, locationName, lat, lon, state, district }
      })

    } catch (err) {

      setError(err.message || 'Failed to get best crops')

    } finally {

      setLoadingBest(false)

    }
  }

  // -----------------------------------
  // CHECK SPECIFIC CROP
  // -----------------------------------

  async function handleCheckCrop(e, cropOverride) {

    e?.preventDefault?.()

    const crop = (cropOverride ?? cropName).trim()

    if (!crop) {
      setError('Select or enter a crop name first')
      return
    }

    setError('')
    setChecking(true)

    try {

      const data = await cropCheck({
        cropName: crop,
        lat,
        lon,
        state: state || undefined,
        district: district || undefined
      })

      navigate('/result', { state: { ...data, locationName } })

    } catch (err) {

      setError(err.message || 'Check failed')

    } finally {

      setChecking(false)

    }
  }

  // -----------------------------------
  // UI
  // -----------------------------------

  return (

    <div className="min-h-screen bg-farming">

      <header className="bg-primary-dark text-white shadow flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">Crop Suitability</h1>

        <button
          onClick={logout}
          className="text-white/90 hover:underline text-sm"
        >
          Logout
        </button>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-6">

        {user?.name && (
          <p className="text-xl font-bold text-primary-dark">
            Welcome, {user.name}! 👋
          </p>
        )}

        {/* LOCATION CARD */}

        <div className="bg-white/90 rounded-xl shadow p-4">

          <div className="flex items-start gap-3">

            <span className="text-2xl">
              {locationAllowed ? '📍' : '🔒'}
            </span>

            <div>

              <p className="text-sm text-gray-700">
                {locationAllowed
                  ? 'Location allowed. We use it for temperature, rainfall, humidity and soil.'
                  : 'Allow location for accurate recommendations.'}
              </p>

              {lat !== null && lon !== null && (

                <div className="mt-1 space-y-0.5">

                  {locationName && (
                    <p className="text-sm font-medium text-gray-800">
                      {locationName}
                    </p>
                  )}

                  <p className="text-xs text-gray-500">
                    Lat: {lat.toFixed(4)}, Lon: {lon.toFixed(4)}
                  </p>

                </div>

              )}

            </div>

          </div>

        </div>

        {/* BEST CROPS */}

        <div className="bg-white rounded-xl shadow p-4">

          <h2 className="font-semibold text-gray-800 mb-2">
            Get best crops for my location
          </h2>

          <p className="text-sm text-gray-600 mb-3">
            Uses your location and current season. No need to select a crop.
          </p>

          <button
            onClick={handleBestCrops}
            disabled={loadingBest}
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingBest
              ? 'Loading…'
              : '🌾 Show best crops for my location'}
          </button>

        </div>

        {/* TOOLS */}

        <div>

          <h2 className="font-semibold text-gray-800 mb-2">
            More tools
          </h2>

          <div className="flex flex-wrap gap-2 mb-4">

            <Link to="/fertilizer" className="bg-white rounded-lg shadow px-4 py-2 hover:bg-gray-50">
              🌱 Fertilizer
            </Link>

            <Link to="/irrigation" className="bg-white rounded-lg shadow px-4 py-2 hover:bg-gray-50">
              💧 Irrigation
            </Link>

            <Link to="/schemes" className="bg-white rounded-lg shadow px-4 py-2 hover:bg-gray-50">
              🏛️ Schemes
            </Link>

            <Link to="/admin" className="bg-white rounded-lg shadow px-4 py-2 hover:bg-gray-50">
              📊 Admin
            </Link>

          </div>

        </div>

        {/* CHECK CROP */}

        <div>

          <h2 className="font-semibold text-gray-800 mb-2">
            Or check if a specific crop is suitable
          </h2>

          {bestCropsFromApi.length > 0 && (

            <>

              <p className="text-xs text-gray-500 mb-2">
                Tap a crop from your location:
              </p>

              <div className="flex flex-wrap gap-2 mb-3">

                {bestCropsFromApi.map((c) => (

                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCheckCrop({ preventDefault: () => {} }, c)}
                    className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200"
                  >
                    {c}
                  </button>

                ))}

              </div>

            </>

          )}

          <form onSubmit={handleCheckCrop} className="space-y-3">

            <input
              type="text"
              placeholder="e.g. Rice, Wheat, Cotton"
              value={cropName}
              onChange={e => setCropName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            />

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={checking}
              className="w-full bg-primary-dark text-white font-medium py-3 rounded-lg disabled:opacity-50"
            >
              {checking
                ? 'Checking…'
                : 'Check if this crop is suitable to cultivate'}
            </button>

          </form>

        </div>

      </main>

    </div>

  )
}