import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signup } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e?.preventDefault()
    if (loading) return

    const n = name.trim()
    const em = email.trim()
    const mob = mobile.trim()
    const pw = password

    if (!n) return setError('Enter your name')
    if (em && !em.includes('@')) return setError('Enter a valid email or leave it blank')
    if (!mob || mob.length < 10) return setError('Enter a valid mobile number (10+ digits)')
    if (!pw || pw.length < 6) return setError('Password must be at least 6 characters')
    if (pw !== confirmPassword) return setError('Passwords do not match')

    setError('')
    setLoading(true)

    try {
      await signup({ email: em || undefined, mobile: mob, password: pw, name: n })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-farming-dark flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🌾</span>
          <h1 className="text-xl font-bold text-gray-800 mt-2">Crop Suitability</h1>
          <p className="text-sm text-gray-500 mt-1">Register</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="tel"
            placeholder="Mobile Number"
            value={mobile}
            onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 15))}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-medium py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Registering…' : 'Register'}
          </button>

          <p className="text-center text-sm text-gray-600">
            <Link to="/login" className="text-primary font-medium">
              Have an account? Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
