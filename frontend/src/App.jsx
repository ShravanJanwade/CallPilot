import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Navbar from './components/layout/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NewBooking from './pages/NewBooking'
import CampaignLive from './pages/CampaignLive'
import BookingConfirmation from './pages/BookingConfirmation'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const user = useAuthStore((s) => s.user)

  return (
    <BrowserRouter>
      {user && <Navbar />}
      <div className={user ? 'pt-16' : ''}>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/auth/callback" element={<Landing />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/book" element={<ProtectedRoute><NewBooking /></ProtectedRoute>} />
          <Route path="/campaign/:groupId" element={<ProtectedRoute><CampaignLive /></ProtectedRoute>} />
          <Route path="/confirmed/:groupId" element={<ProtectedRoute><BookingConfirmation /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
