import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { schemes } from '../api'

export default function SchemesPage() {
  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    schemes(lang)
      .then(setList)
      .catch(err => setError(err.message || 'Failed'))
      .finally(() => setLoading(false))
  }, [lang])

  return (
    <div className="min-h-screen bg-farming">
      <header className="bg-primary-dark text-white shadow flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-white/90 hover:underline">← Back</Link>
        <h1 className="text-lg font-semibold">Government Schemes</h1>
        <select
          value={lang}
          onChange={e => setLang(e.target.value)}
          className="bg-white/20 text-white border border-white/40 rounded px-2 py-1 text-sm"
        >
          <option value="en">English</option>
          <option value="te">తెలుగు</option>
          <option value="hi">हिंदी</option>
        </select>
      </header>
      <main className="p-6 max-w-lg mx-auto">
        {loading && <div className="text-center py-8">Loading…</div>}
        {error && <p className="text-red-600 text-center py-4">{error}</p>}
        {!loading && !error && list.map((s, i) => (
          <div key={s.id || i} className="bg-white rounded-xl shadow p-4 mb-4">
            <h2 className="font-semibold text-gray-800">{s.name || s.name_en || '—'}</h2>
            {s.amount && <p className="text-sm mt-1">Amount: {s.amount}</p>}
            {s.eligibility && <p className="text-sm text-gray-600">Eligibility: {s.eligibility}</p>}
            {s.state && <p className="text-xs text-gray-500 mt-1">State: {s.state}</p>}
            {s.link && (
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-primary font-medium text-sm hover:underline"
              >
                Open link ↗
              </a>
            )}
          </div>
        ))}
      </main>
    </div>
  )
}
