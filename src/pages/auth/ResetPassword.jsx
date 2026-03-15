import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: form.password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password updated!')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black mb-2"><span className="text-white">Tour</span><span className="text-accent">ena</span></h1>
        </div>
        <div className="bg-surface border border-white/[0.08] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Set New Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="New Password" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            <Input label="Confirm Password" type="password" placeholder="••••••••" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} required />
            <Button type="submit" loading={loading} className="w-full">Update Password</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
