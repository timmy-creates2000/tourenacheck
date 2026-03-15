import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, formatDateTime } from '../../lib/utils'
import { TX_TYPE_COLORS } from '../../lib/constants'
import toast from 'react-hot-toast'

const PAGE_SIZE = 30
const TX_TYPES = ['purchase','entry_fee','prize','practice_fee','withdrawal','referral_bonus','organizer_earnings','refund']

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState({ type: '', status: '' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase.from('coin_transactions')
        .select('*, user:user_id(id, username, avatar_url)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (filter.type) q = q.eq('type', filter.type)
      if (filter.status) q = q.eq('status', filter.status)
      const { data, error: err } = await q
      if (err) throw err
      setTransactions(data ?? [])
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  function exportCSV() {
    if (transactions.length === 0) { toast.error('No transactions to export'); return }
    const rows = ['Date,User,Type,Amount TC,Status,Description'].concat(
      transactions.map(t =>
        `${t.created_at},${t.user?.username ?? ''},${t.type},${t.amount_tc},${t.status},"${t.description ?? ''}"`
      )
    ).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv,' + encodeURIComponent(rows)
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    toast.success('CSV exported')
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-white">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchTransactions}>↻ Refresh</Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description..."
          className="flex-1 min-w-[180px] bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
        <select value={filter.type} onChange={e => { setFilter(p => ({ ...p, type: e.target.value })); setPage(0) }}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="">All Types</option>
          {TX_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filter.status} onChange={e => { setFilter(p => ({ ...p, status: e.target.value })); setPage(0) }}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span><Button size="sm" onClick={fetchTransactions}>Retry</Button>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Date', 'User', 'Type', 'Amount', 'Status', 'Description'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading ? Array(10).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>
                )) : transactions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted">No transactions found</td></tr>
                ) : transactions
                  .filter(tx => !search || tx.description?.toLowerCase().includes(search.toLowerCase()))
                  .map(tx => (
                    <tr key={tx.id} className="hover:bg-surface2 transition-colors">
                      <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{formatDateTime(tx.created_at)}</td>
                      <td className="px-4 py-3"><Avatar user={tx.user} size={28} showName /></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TX_TYPE_COLORS[tx.type] ?? 'bg-gray-600 text-gray-200'}`}>
                          {tx.type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-bold text-sm ${tx.amount_tc > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount_tc > 0 ? '+' : ''}{formatTC(tx.amount_tc)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${tx.status === 'confirmed' ? 'text-green-400' : tx.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs max-w-xs truncate">{tx.description}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-white/[0.06]">
            <span className="text-xs text-muted">Page {page + 1}</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous</Button>
              <Button variant="ghost" size="sm" disabled={transactions.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Next →</Button>
            </div>
          </div>
        </Card>
      )}
    </PageWrapper>
  )
}
