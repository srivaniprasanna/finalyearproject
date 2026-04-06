import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { sendOtp } from '../api'

export default function Login() {
  const [mode, setMode] = useState('otp') // 'otp' | 'password'

  // OTP mode
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(1)

  // Password mode
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { registerWithOtp, loginWithPassword } = useAuth()
  const navigate = useNavigate()

  // ---------- Email OTP ----------
  async function handleSendOtp(e) {
    e?.preventDefault()
    const em = email.trim()
    if (!em || !em.includes('@')) {
      setError('Enter a valid email')
      return
    }
    setError('')
    setLoading(true)
    try {
      await sendOtp({ email: em })
      setStep(2)
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e) {
    e?.preventDefault()
    if (!otp.trim()) {
      setError('Enter OTP')
      return
    }
    setError('')
    setLoading(true)
    try {
      await registerWithOtp({ email: email.trim(), otp: otp.trim() })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  // ---------- Mobile + Password ----------
  async function handlePasswordLogin(e) {
    e?.preventDefault()
    const mob = mobile.trim()
    if (!mob || mob.length < 10) {
      setError('Enter a valid mobile number')
      return
    }
    if (!password) {
      setError('Enter your password')
      return
    }
    setError('')
    setLoading(true)
    try {
      await loginWithPassword({ mobile: mob, password })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Invalid mobile or password')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setStep(1)
    setOtp('')
  }

  return (
    <div className="min-h-screen bg-farming-dark flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🌾</span>
          <h1 className="text-xl font-bold text-gray-800 mt-2">Crop Suitability</h1>
          <p className="text-sm text-gray-500 mt-1">Login</p>
        </div>

        {/* Nav Pills */}
        <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
          <button
            type="button"
            onClick={() => switchMode('otp')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'otp'
                ? 'bg-primary text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Email OTP
          </button>
          <button
            type="button"
            onClick={() => switchMode('password')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'password'
                ? 'bg-primary text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Mobile + Password
          </button>
        </div>

        {mode === 'otp' ? (
          step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                required
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-600">OTP sent to {email}</p>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                maxLength={6}
                required
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify & Continue'}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError('') }}
                className="w-full text-primary text-sm font-medium"
              >
                Change email
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <input
              type="tel"
              placeholder="Mobile Number"
              value={mobile}
              onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 15))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-6">
          <Link to="/register" className="text-primary font-medium">
            Don't have an account? Register
          </Link>
        </p>
      </div>
    </div>
  )
}
