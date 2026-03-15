import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import { Clock, XCircle } from 'lucide-react'

export default function AccountPending() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const isRejected = profile?.account_status === 'rejected'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-black mb-8">
          <span className="text-white">Tour</span><span className="text-accent">ena</span>
        </h1>

        <div className="bg-surface border border-white/[0.08] rounded-2xl p-8 space-y-6">
          {isRejected ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <XCircle size={32} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Account Rejected</h2>
                <p className="text-muted text-sm mb-3">Your account application was not approved.</p>
                {profile?.rejection_reason && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
                    <span className="font-semibold">Reason: </span>{profile.rejection_reason}
                  </div>
                )}
                <p className="text-xs text-muted mt-3">Contact support to appeal this decision.</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
                <Clock size={32} className="text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Account Under Review</h2>
                <p className="text-muted text-sm">Your account is being reviewed. This usually takes up to 24 hours.</p>
              </div>
            </>
          )}

          <Button variant="secondary" onClick={handleLogout} className="w-full">
            <LogOut size={16} className="mr-2" /> Logout
          </Button>
        </div>
      </div>
    </div>
  )
}

function LogOut({ size, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
