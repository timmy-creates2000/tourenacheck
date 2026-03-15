import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import tourenaIcon from '../../../image/tourena-icon.png'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function Signup() {
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', confirm: '', username: '', role: 'player', referralCode: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })) }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await signUp({ email: form.email, password: form.password, username: form.username, role: form.role, referralCode: form.referralCode })
      navigate('/pending')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-2">
            <img src={tourenaIcon} alt="Tourena" className="w-16 h-16 rounded-xl" />
            <h1 className="text-4xl font-black">
              <span className="text-white">Toure</span><span className="text-accent">na</span>
            </h1>
          </div>
          <p className="text-muted">Join the arena</p>
        </div>

        <div className="bg-surface border border-white/[0.08] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Create Account</h2>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-white/10 bg-white text-gray-800 font-semibold text-sm hover:bg-gray-100 transition-colors mb-4 disabled:opacity-60">
            <GoogleIcon />
            {googleLoading ? 'Redirecting...' : 'Sign up with Google'}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Username" placeholder="your_gamertag" value={form.username} onChange={set('username')} required />
            <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            <Input label="Password" type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required />
            <Input label="Confirm Password" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-white/80">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {['player', 'organizer'].map(r => (
                  <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r }))}
                    className={`py-3 rounded-xl border text-sm font-semibold capitalize transition-all ${form.role === r ? 'border-primary bg-primary/20 text-white glow-purple' : 'border-white/10 text-muted hover:border-white/20'}`}>
                    {r === 'player' ? '🎮 Player' : '🎪 Organizer'}
                  </button>
                ))}
              </div>
            </div>

            <Input label="Referral Code (optional)" placeholder="Enter code if you have one" value={form.referralCode} onChange={set('referralCode')} />
            <Button type="submit" loading={loading} className="w-full" size="lg">Create Account</Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account? <Link to="/login" className="text-primary hover:text-purple-300 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
