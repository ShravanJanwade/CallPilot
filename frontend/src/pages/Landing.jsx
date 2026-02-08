import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Zap, MapPin, Calendar } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Landing() {
  const navigate = useNavigate()
  const { setUser, user } = useAuthStore()

  useEffect(() => {
    if (user) { navigate('/dashboard'); return }

    // Load Google Identity Services
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse,
      })
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'outline', size: 'large', width: 320, text: 'signin_with' }
      )
    }
    document.body.appendChild(script)
  }, [])

  function handleCredentialResponse(response) {
    // Decode JWT to get user info
    const payload = JSON.parse(atob(response.credential.split('.')[1]))
    const userData = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      sub: payload.sub,
    }
    setUser(userData, response.credential)
    navigate('/dashboard')
  }

  const features = [
    { icon: Phone, title: 'AI Calls For You', desc: 'Our agent calls providers and negotiates in natural conversation' },
    { icon: Zap, title: 'Parallel Swarm Mode', desc: 'Call up to 15 providers simultaneously to find the best slot' },
    { icon: MapPin, title: 'Smart Matching', desc: 'Ranks by availability, ratings, distance, and your preferences' },
    { icon: Calendar, title: 'Calendar Sync', desc: 'Real-time Google Calendar checks prevent double bookings' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-sky-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800">CallPilot</h1>
        </div>

        <p className="text-xl text-slate-600 max-w-lg text-center mb-2">
          Your AI calls. You just confirm.
        </p>
        <p className="text-slate-400 max-w-md text-center mb-10">
          Book appointments across multiple providers in minutes, not hours. 
          CallPilot calls, negotiates, and finds the perfect slot for you.
        </p>

        <div id="google-signin-btn" className="mb-12" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <Icon className="w-8 h-8 text-sky-500 mb-3" />
              <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center py-6 text-sm text-slate-400">
        Built for ElevenLabs Hackathon 2026
      </footer>
    </div>
  )
}