import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatTC } from '../../lib/utils'
import { toast } from 'react-hot-toast'
import { Gift, X } from 'lucide-react'

export default function GiftCoinModal({ onClose, onSuccess, receiverUser = null }) {
  const { profile, refreshProfile } = useAuth()
  const [step, setStep] = useState(receiverUser ? 2 : 1)
  const [username, setUsername] = useState('')
  const [receiver, setReceiver] = useState(receiverUser)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(false)

  async function findUser() {
    if (!username.trim()) return
    setSearching(true)
    const { data } = await supabase.from('users')
      .select('id, username, avatar_url, display_name')
      .eq('username', username.trim())
      .eq('account_status', 'approved')
      .neq('id', profile.id)
      .single()
    setSearching(false)
    if (!data) { toast.error('User not found'); return }
    setReceiver(data)
    setStep(2)
  }

  async function sendGift() {
    const tc = parseInt(amount)
    if (!tc || tc <= 0) { toast.error('Enter a valid amount'); return }
    if (tc > (profile?.coin_balance ?? 0)) { toast.error('Insufficient balance'); return }
    if (message.length > 200) { toast.error('Message too long (max 200 chars)'); return }
    setSending(true)
    const { error } = await supabase.rpc('send_coin_gift', {
      p_sender_id: profile.id,
      p_receiver_id: receiver.id,
      p_amount: tc,
      p_message: message || null,
    })
    setSending(false)
    if (error) { toast.error(error.message); return }
    await refreshProfile()
    toast.success(`🎁 Sent ${formatTC(tc)} TC to ${receiver.username}!`)
    onSuccess?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Gift size={18} className="text-accent" />
            <h2 className="text-lg font-bold text-white">Gift Coins</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {step === 1 ? (
            <>
              <div className="bg-surface2 rounded-xl p-3 text-sm flex justify-between">
                <span className="text-muted">Your balance</span>
                <span className="text-accent font-bold">🪙 {formatTC(profile?.coin_balance ?? 0)}</span>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Recipient username</label>
                <div className="flex gap-2">
                  <input value={username} onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && findUser()}
                    placeholder="Enter username..."
                    className="flex-1 bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                  <button onClick={findUser} disabled={searching}
                    className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                    {searching ? '...' : 'Find'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Receiver card */}
              <div className="flex items-center gap-3 bg-surface2 rounded-xl p-3">
                {receiver.avatar_url
                  ? <img src={receiver.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                  : <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center text-sm font-bold text-white">{receiver.username.slice(0,2).toUpperCase()}</div>
                }
                <div>
                  <p className="text-sm font-semibold text-white">{receiver.username}</p>
                  {receiver.display_name && <p className="text-xs text-muted">{receiver.display_name}</p>}
                </div>
                <button onClick={() => { setStep(1); setReceiver(null) }} className="ml-auto text-xs text-muted hover:text-white">Change</button>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Amount (TC)</label>
                <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="How many TC to gift?"
                  className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                {amount && parseInt(amount) > 0 && (
                  <p className="text-xs text-muted mt-1">
                    Balance after: 🪙 {formatTC((profile?.coin_balance ?? 0) - parseInt(amount))}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Message (optional)</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                  placeholder="Add a message..."
                  className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none" />
                <p className="text-xs text-muted text-right">{message.length}/200</p>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 bg-surface2 text-white py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={sendGift} disabled={sending || !amount || parseInt(amount) <= 0}
                  className="flex-1 bg-accent hover:bg-accent/80 disabled:opacity-50 text-black font-bold py-2 rounded-lg text-sm transition-colors">
                  {sending ? 'Sending...' : `🎁 Send ${amount ? formatTC(parseInt(amount)) : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
