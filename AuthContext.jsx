import { createContext, useContext, useState, useEffect } from 'react'
import { sendOtp as apiSendOtp, registerWithOtp as apiRegisterWithOtp, signup as apiSignup, loginWithPassword as apiLoginWithPassword } from '../api'

export const AuthContext = createContext(null)

const TOKEN_KEY = 'crop_token'
const USER_KEY = 'crop_user'

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user from localStorage when app starts
  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const savedUser = localStorage.getItem(USER_KEY)

      if (token && savedUser) {
        setUser(JSON.parse(savedUser))
      }
    } catch (error) {
      console.error("Auth load error:", error)
    }

    setLoading(false)
  }, [])


  // SEND OTP
  const sendOtp = async ({ email, name, mobile }) => {
    return apiSendOtp({ email, name, mobile })
  }


  // REGISTER WITH OTP (login)
  const registerWithOtp = async ({ email, otp, name, mobile }) => {

    const data = await apiRegisterWithOtp({ email, otp, name, mobile })

    const userData = {
      id: data.user_id,
      email: data.email,
      name: data.name,
      mobile: data.mobile
    }

    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))

    setUser(userData)
  }


  // SIGNUP (register with password)
  const signup = async ({ email, mobile, password, name }) => {
    const data = await apiSignup({ email, mobile, password, name })
    const userData = {
      id: data.user_id,
      email: data.email,
      name: data.name,
      mobile: data.mobile
    }
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setUser(userData)
  }


  // LOGIN WITH PASSWORD (mobile + password)
  const loginWithPassword = async ({ mobile, password }) => {
    const data = await apiLoginWithPassword({ mobile, password })
    const userData = {
      id: data.user_id,
      email: data.email,
      name: data.name,
      mobile: data.mobile
    }
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setUser(userData)
  }


  // LOGOUT
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }


  const value = {
    user,
    loading,
    sendOtp,
    registerWithOtp,
    signup,
    loginWithPassword,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


// CUSTOM HOOK
export function useAuth() {

  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}