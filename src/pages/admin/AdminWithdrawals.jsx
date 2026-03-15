import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, formatFiat, formatDateTime } from '../../lib/utils'
import { STATUS_COLORS } from '../../lib/constants'
import toast from 'react-hot-toast'

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [noteModal, setNoteModal] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => { fetchWithdrawals() }, [])

  useEffect(() => {
    const channel = supabase.channel('admin-withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, fetchWithdrawals)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchWithdrawals() {
    const { data } = await supabase.from('withdrawals').select('*, users(id, username, avatar_url)').order('created_at', { ascending: false })
    setWithdrawals(data ?? [])
    setLoading(false)
  }

  async function updateStatus(id, status, adminNote = null) {
    await supabase.from('withdrawals').update({ status, admin_note: adminNote }).eq('id', id)
    fetchWithdrawals()
    toast.success(`Withdrawal ${status}`)
  }

  const pending = withdrawals.filter(w => w.status === 'pending').length
  const completedToday = withdrawals.filter(w => w.status === 'completed' && new Date(w.created_at).toDateString() === new Date().toDateString()).length
  const failed = withdrawals.filter(w => w.status === 'failed').length

  return (
    <PageWrapper>
      <h1 className="text-3xl font-black text-white mb-6">Withdrawals</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: pending, color: 'text-amber-400' },
          { label: 'Completed Today', value: completedToday, color: 'text-green-400' },
          { label: 'Failed', value: failed, color: 'text-red-400' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['User', 'Type', 'Gross TC', 'Commission', 'Net TC', 'Net Fiat', 'Bank', 'Status', 'Requested', 'Actions'].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={10} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>)
              ) : withdrawals.map(w => (
                <tr key={w.id} className={`hover:bg-surface2 transition-colors ${w.status === 'failed' ? 'bg-red-500/5' : ''}`}>
                  <td className="px-3 py-3"><Avatar user={w.users} size={28} showName /></td>
                  <td className="px-3 py-3 text-muted capitalize">{w.withdrawal_type?.replace('_', ' ')}</td>
                  <td className="px-3 py-3 text-white">🪙 {formatTC(w.gross_tc)}</td>
                  <td className="px-3 py-3 text-red-400">🪙 {formatTC(w.tourena_commission_tc)}</td>
                  <td className="px-3 py-3 text-accent font-semibold">🪙 {formatTC(w.net_tc)}</td>
                  <td className="px-3 py-3 text-white">{formatFiat(w.net_fiat, w.currency)}</td>
                  <td className="px-3 py-3 text-muted text-xs">{w.bank_name}<br />{w.account_number}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[w.status]}`}>{w.status}</span>
                  </td>
                  <td className="px-3 py-3 text-muted text-xs">{formatDateTime(w.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      {w.status === 'pending' && (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => updateStatus(w.id, 'processing')}>Process</Button>
                          <Button size="sm" variant="danger" onClick={() => updateStatus(w.id, 'failed')}>Fail</Button>
                        </>
                      )}
                      {w.status === 'failed' && (
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(w.id, 'pending')}>Retry</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setNoteModal(w); setNote(w.admin_note ?? '') }}>Note</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!noteModal} onClose={() => setNoteModal(null)} title="Admin Note">
        <div className="space-y-4">
          <Input label="Note" placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} />
          <Button className="w-full" onClick={() => { updateStatus(noteModal.id, noteModal.status, note); setNoteModal(null) }}>Save Note</Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
