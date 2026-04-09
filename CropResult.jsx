import { useLocation, useNavigate } from 'react-router-dom'

export default function CropResult() {
  const { state } = useLocation()
  const navigate = useNavigate()
  if (!state) {
    navigate('/')
    return null
  }
  const { crop_name, suitable, reasons, alternative_crops, location_data, locationName } = state

  return (
    <div className="min-h-screen bg-farming">
      <header className="bg-primary-dark text-white shadow px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate('/')} className="text-white/90 hover:underline">← Back</button>
        <h1 className="text-lg font-semibold">{crop_name} – {suitable ? 'Suitable' : 'Not suitable'}</h1>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-6">
        {locationName && (
          <div className="bg-white/90 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-800">📍 {locationName}</p>
          </div>
        )}
        <div className={`rounded-xl p-4 ${suitable ? 'bg-green-100' : 'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{suitable ? '✅' : '❌'}</span>
            <p className="text-gray-800">
              {suitable
                ? `Yes, ${crop_name} is suitable to cultivate in your location based on temperature, rainfall, humidity and soil.`
                : `${crop_name} may not be the best choice. Consider the alternatives below.`}
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-gray-800 mb-3">Slide-by-slide reasons</h2>
          <div className="space-y-3">
            {(reasons || []).map((r, i) => (
              <div key={i} className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                <h3 className="font-medium text-gray-800">{r.title}</h3>
                <p className="text-sm text-gray-600 mt-1">Required: {r.required}</p>
                <p className="text-sm text-gray-600">Your location: {r.actual}</p>
                <p className={`text-sm mt-2 ${r.suitable ? 'text-green-700' : 'text-amber-700'}`}>{r.message}</p>
              </div>
            ))}
          </div>
        </div>

        {alternative_crops?.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Other crops recommended for your area</h2>
            <div className="flex flex-wrap gap-2">
              {alternative_crops.map((c) => (
                <span key={c} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">{c}</span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
