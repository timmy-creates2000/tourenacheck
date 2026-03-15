import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatTC, formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'

const STATUS_TABS = ['pending_approval', 'approved', 'rejected', '']

export default function ModTournaments() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending_approval')
  const [search, setSearch] = useState('')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [acting, setActing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('tournaments')
      .select('*, organizer:organizer_id(username, avatar_url)')
      .order('created_at', { ascending: false })
    if (filter) q = q.eq('status', filter)
    if (search) q = q.ilike('title', `%${search}%`)
    const { data, error } = await q
    if (error) toast.error(error.message)
    else setTournaments(data ?? [])
    setLoading(false)
  }, [filter, search])

  useEffect(() => { load() }, [load])

  async function approve(id) {
    setActing(id)
    const { error } = await supabase.from('tournaments').update({ status: 'approved' }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Tournament approved'); load() }
    setActing(null)
  }

  async function reject(id, reason) {
    if (!reason.trim()) { toast.error('Provide a rejection reason'); return }
    setActing(id)
    const { error } = await supabase.from('tournaments').update({ status: 'rejected', review_notes: reason }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Tournament rejected'); setRejectModal(null); load() }
    setActing(null)
  }

  const STATUS_COLORS = { pending_approval: 'bg-amber-500/20 text-amber-400', approved: 'bg-green-500/20 text-green-400', rejected: 'bg-red-500/20 text-red-400', ongoing: 'bg-blue-500/20 text-blue-400', completed: 'bg-surface2 text-muted' }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Review Tournaments</h1>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${filter === s ? 'bg-primary text-white' : 'bg-surface2 text-muted hover:text-white'}`}>
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title..."
        className="w-full mb-5 bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-primary" />

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20 text-muted">No tournaments found</div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => (
            <div key={t.id} className={`bg-surface border rounded-xl p-4 flex items-center gap-4 ${t.status === 'pending_approval' ? 'border-amber-500/20' : 'border-white/10'}`}>
              {t.thumbnail_url
                ? <img src={t.thumbnail_url} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" alt="" />
                : <div className="w-14 h-14 rounded-lg bg-surface2 flex items-center justify-center text-2xl flex-shrink-0">🎮</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{t.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? 'bg-surface2 text-muted'}`}>{t.status?.replace(/_/g,' ')}</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {t.game_name} · {t.organizer?.username} · Entry: {t.is_practice ? 'Free' : `🪙 ${formatTC(t.entry_fee_tc)}`} · Prize: {t.is_practice ? '—' : `🪙 ${formatTC(t.prize_pool_tc)}`}
                </p>
                <p className="text-xs text-muted">{formatDate(t.created_at)}</p>
                {t.review_notes && <p className="text-xs text-red-400 mt-1">Rejection note: {t.review_notes}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <Link to={`/tournament/${t.id}`} className="text-xs bg-surface2 text-muted hover:text-white px-3 py-1.5 rounded-lg transition-colors">View</Link>
                {t.status === 'pending_approval' && <>
                  <button onClick={() => approve(t.id)} disabled={acting === t.id}
                    className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    {acting === t.id ? '...' : 'Approve'}
                  </button>
                  <button onClick={() => { setRejectModal(t); setRejectReason('') }}
                    className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors">
                    Reject
                  </button>
                </>}
                {t.status === 'rejected' && (
                  <button onClick={() => approve(t.id)} disabled={acting === t.id}
                    className="text-xs bg-surface2 text-muted hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                    Re-approve
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
            <h2 className="text-lg font-bold text-white">Reject Tournament</h2>
            <p className="text-sm text-muted">Rejecting: <span className="text-white">{rejectModal.title}</span></p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Explain why this tournament was rejected..."
              className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 bg-surface2 text-white py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={() => reject(rejectModal.id, rejectReason)} disabled={acting === rejectModal.id}
                className="flex-1 bg-red-500/80 hover:bg-red-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {acting === rejectModal.id ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
