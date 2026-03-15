import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'

const STATUS_TABS = ['pending', 'approved', 'suspended', 'rejected', '']

export default function ModUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [acting, setActing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('users').select('id, username, email, role, account_status, avatar_url, country, created_at, coin_balance')
      .order('created_at', { ascending: false })
    if (status) q = q.eq('account_status', status)
    if (search) q = q.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
    const { data, error } = await q
    if (error) toast.error(error.message)
    else setUsers(data ?? [])
    setLoading(false)
  }, [status, search])

  useEffect(() => { load() }, [load])

  async function updateStatus(id, newStatus, reason = null) {
    setActing(id)
    const { error } = await supabase.from('users').update({ account_status: newStatus, rejection_reason: reason }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(`User ${newStatus}`); load() }
    setActing(null)
  }

  const STATUS_COLORS = { pending: 'bg-amber-500/20 text-amber-400', approved: 'bg-green-500/20 text-green-400', rejected: 'bg-red-500/20 text-red-400', suspended: 'bg-orange-500/20 text-orange-400' }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Manage Users</h1>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${status === s ? 'bg-primary text-white' : 'bg-surface2 text-muted hover:text-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username or email..."
        className="w-full mb-5 bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-primary" />

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-muted">No users found</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className={`bg-surface border rounded-xl p-4 flex items-center gap-4 ${u.account_status === 'pending' ? 'border-amber-500/20' : 'border-white/10'}`}>
              {u.avatar_url
                ? <img src={u.avatar_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                : <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">{u.username?.slice(0,2).toUpperCase()}</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{u.username}</span>
                  <span className="text-xs text-muted capitalize">{u.role}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[u.account_status] ?? 'bg-surface2 text-muted'}`}>{u.account_status}</span>
                </div>
                <p className="text-xs text-muted mt-0.5">{u.email} · {u.country ?? 'Unknown'} · Joined {formatDate(u.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {u.account_status === 'pending' && <>
                  <button onClick={() => updateStatus(u.id, 'approved')} disabled={acting === u.id}
                    className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    Approve
                  </button>
                  <button onClick={() => { setRejectModal(u); setRejectReason('') }}
                    className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors">
                    Reject
                  </button>
                </>}
                {u.account_status === 'approved' && (
                  <button onClick={() => updateStatus(u.id, 'suspended')} disabled={acting === u.id}
                    className="text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    Suspend
                  </button>
                )}
                {(u.account_status === 'suspended' || u.account_status === 'rejected') && (
                  <button onClick={() => updateStatus(u.id, 'approved')} disabled={acting === u.id}
                    className="text-xs bg-surface2 text-muted hover:text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    Reinstate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Reject Account</h2>
            <p className="text-sm text-muted">Rejecting: <span className="text-white">{rejectModal.username}</span></p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Explain why this account was rejected..."
              className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 bg-surface2 text-white py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={() => { updateStatus(rejectModal.id, 'rejected', rejectReason); setRejectModal(null) }}
                className="flex-1 bg-red-500/80 hover:bg-red-500 text-white py-2 rounded-lg text-sm">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
