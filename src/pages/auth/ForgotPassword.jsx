import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black mb-2"><span className="text-white">Tour</span><span className="text-accent">ena</span></h1>
        </div>
        <div className="bg-surface border border-white/[0.08] rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📧</div>
              <h2 className="text-xl font-bold text-white">Check your email</h2>
              <p className="text-muted text-sm">We sent a password reset link to <span className="text-white">{email}</span></p>
              <Link to="/login" className="text-primary hover:text-purple-300 text-sm">Back to login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
              <p className="text-muted text-sm mb-6">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                <Button type="submit" loading={loading} className="w-full">Send Reset Link</Button>
              </form>
              <p className="text-center text-sm text-muted mt-4">
                <Link to="/login" className="text-primary hover:text-purple-300">Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
