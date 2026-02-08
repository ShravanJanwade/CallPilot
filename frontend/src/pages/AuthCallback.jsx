import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { login, error } = useAuthStore()

    useEffect(() => {
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')

        if (errorParam) {
            console.error('OAuth error:', errorParam)
            navigate('/')
            return
        }

        if (code) {
            handleCallback(code)
        } else {
            navigate('/')
        }
    }, [searchParams])

    const handleCallback = async (code) => {
        try {
            await login(code)
            navigate('/dashboard')
        } catch (err) {
            console.error('Login failed:', err)
            navigate('/')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-off-white">
            <div className="text-center">
                {error ? (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-error mb-4">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="btn btn-primary"
                        >
                            Back to Home
                        </button>
                    </div>
                ) : (
                    <div>
                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Signing you in...</p>
                    </div>
                )}
            </div>
        </div>
    )
}
