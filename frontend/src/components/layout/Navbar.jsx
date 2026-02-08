import { Link, useLocation } from 'react-router-dom'
import { Phone, LayoutDashboard, CalendarPlus, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/book', label: 'New Booking', icon: CalendarPlus },
    { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Navbar() {
    const { pathname } = useLocation()
    const { user, logout } = useAuthStore()

    return (
        <nav className="fixed top-0 w-full h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-6">
            <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg text-slate-800">CallPilot</span>
            </Link>

            <div className="flex items-center gap-1">
                {links.map(({ to, label, icon: Icon }) => (
                    <Link
                        key={to} to={to}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${pathname === to ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <Icon className="w-4 h-4" /> {label}
                    </Link>
                ))}
            </div>

            <div className="flex items-center gap-3">
                {user && (
                    <>
                        <span className="text-sm text-slate-600">{user.name}</span>
                        {user.picture && (
                            <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                        )}
                    </>
                )}
                <button onClick={logout} className="text-slate-400 hover:text-slate-600 transition">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </nav>
    )
}