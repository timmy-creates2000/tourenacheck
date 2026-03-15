import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, formatDate } from '../../lib/utils'
import { STATUS_COLORS } from '../../lib/constants'
import toast from 'react-hot-toast'

const STATUS_TABS = ['pending_approval', 'approved', 'ongoing', 'completed', 'rejected', '']

export default function AdminTournaments() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('pending_approval')
  const [search, setSearch] = useState('')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const fetchTournaments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase.from('tournaments')
        .select('*, organizer:organizer_id(id, username, avatar_url)')
        .order('created_at', { ascending: false })
      if (filter) q = q.eq('status', filter)
      if (search) q = q.ilike('title', `%${search}%`)
      const { data, error: err } = await q
      if (err) throw err
      setTournaments(data ?? [])
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => { fetchTournaments() }, [fetchTournaments])

  async function approve(id) {
    setActionLoading(id)
    try {
      const { error } = await supabase.from('tournaments').update({ status: 'approved' }).eq('id', id)
      if (error) throw error
      toast.success('Tournament approved')
      fetchTournaments()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function reject(id, reason) {
    if (!reason.trim()) { toast.error('Please provide a rejection reason'); return }
    setActionLoading(id)
    try {
      const { error } = await supabase.from('tournaments')
        .update({ status: 'rejected', review_notes: reason }).eq('id', id)
      if (error) throw error
      toast.success('Tournament rejected')
      setRejectModal(null)
      fetchTournaments()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <PageWrapper>
      <h1 className="text-3xl font-black text-white mb-6">Tournaments</h1>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${filter === s ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-white hover:bg-surface2'}`}>
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title..."
        className="w-full mb-6 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" onClick={fetchTournaments}>Retry</Button>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Tournament', 'Organizer', 'Game', 'Entry', 'Prize', 'Players', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading ? (
                  Array(6).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={9} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>
                  ))
                ) : tournaments.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-muted">No tournaments found</td></tr>
                ) : tournaments.map(t => (
                  <tr key={t.id} className={`hover:bg-surface2 transition-colors ${t.status === 'pending_approval' ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {t.thumbnail_url
                          ? <img src={t.thumbnail_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                          : <div className="w-10 h-10 rounded-lg bg-surface2 flex items-center justify-center text-lg flex-shrink-0">🎮</div>
                        }
                        <div>
                          <p className="font-semibold text-white text-xs leading-tight">{t.title}</p>
                          {t.is_practice && <Badge color="gray" outline>Practice</Badge>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Avatar user={t.organizer} size={28} showName /></td>
                    <td className="px-4 py-3 text-muted text-xs">{t.game_name}</td>
                    <td className="px-4 py-3 text-white text-xs">{t.is_practice ? 'Free' : `🪙 ${formatTC(t.entry_fee_tc)}`}</td>
                    <td className="px-4 py-3 text-accent text-xs">{t.is_practice ? '—' : `🪙 ${formatTC(t.prize_pool_tc)}`}</td>
                    <td className="px-4 py-3 text-muted text-xs">{t.current_participants}/{t.max_participants}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? 'bg-gray-600 text-gray-200'}`}>
                        {t.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <Link to={`/tournament/${t.id}`}><Button size="sm" variant="ghost">View</Button></Link>
                        {t.status === 'pending_approval' && (
                          <>
                            <Button size="sm" variant="secondary" loading={actionLoading === t.id} onClick={() => approve(t.id)}>Approve</Button>
                            <Button size="sm" variant="danger" onClick={() => { setRejectModal(t); setRejectReason('') }}>Reject</Button>
                          </>
                        )}
                        {t.status === 'rejected' && (
                          <Button size="sm" variant="secondary" loading={actionLoading === t.id} onClick={() => approve(t.id)}>Re-approve</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Tournament">
        <div className="space-y-4">
          <div className="bg-surface2 rounded-xl p-3 text-sm">
            <span className="text-muted">Tournament: </span>
            <span className="text-white font-semibold">{rejectModal?.title}</span>
          </div>
          <Input label="Rejection Reason *" placeholder="Explain why this tournament was rejected..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={actionLoading === rejectModal?.id}
              onClick={() => reject(rejectModal.id, rejectReason)}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
