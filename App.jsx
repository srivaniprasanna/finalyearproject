import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import CropResult from './pages/CropResult'
import BestCrops from './pages/BestCrops'
import Fertilizer from './pages/Fertilizer'
import Irrigation from './pages/Irrigation'
import Schemes from './pages/Schemes'
import Admin from './pages/Admin'

function AuthWrapper({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<AuthWrapper><Home /></AuthWrapper>} />
      <Route path="/result" element={<AuthWrapper><CropResult /></AuthWrapper>} />
      <Route path="/best-crops" element={<AuthWrapper><BestCrops /></AuthWrapper>} />
      <Route path="/fertilizer" element={<AuthWrapper><Fertilizer /></AuthWrapper>} />
      <Route path="/irrigation" element={<AuthWrapper><Irrigation /></AuthWrapper>} />
      <Route path="/schemes" element={<AuthWrapper><Schemes /></AuthWrapper>} />
      <Route path="/admin" element={<AuthWrapper><Admin /></AuthWrapper>} />
    </Routes>
  )
}
