/**
 * AdminRevenue.jsx
 * Live revenue dashboard for platform admins.
 *
 * Updates in real-time via Supabase Realtime channels whenever:
 * - A coin transaction is created (purchase, entry fee, prize, etc.)
 * - A withdrawal is created or updated
 * - A platform_revenue record is created
 *
 * Key metrics:
 * - TC sold / fiat collected from coin purchases
 * - Fiat paid out via withdrawals
 * - Float = fiat collected − fiat paid out (actual, not estimated)
 * - Safe to withdraw = float × 60%
 * - Reserve = float × 40%
 * - Commissions earned (player + organizer withdrawal fees)
 * - Practice tournament fees
 * - TC in circulation = total sold − total withdrawn
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatTC, formatFiat, formatDateTime, timeAgo } from '../../lib/utils'
import { TX_TYPE_COLORS } from '../../lib/constants'
import toast from 'react-hot-toast'

const PERIODS = ['Today', 'This Week', 'This Month', 'All Time']
const PIE_COLORS = ['#7C3AED', '#F59E0B', '#10B981', '#EF4444', '#3B82F6']
const CURRENCY = 'NGN'

function StatCard({ label, value, sub, color, highlight, live }) {
  return (
    <Card className={`p-4 relative overflow-hidden ${highlight ? 'border-accent/40 bg-accent/5' : ''}`}>
      {live && (
        <span className="absolute top-2 right-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400">live</span>
        </span>
      )}
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-xl font-black ${color ?? (highlight ? 'text-accent' : 'text-white')}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </Card>
  )
}

export default function AdminRevenue() {
  const [period, setPeriod] = useState('All Time')
  const [revenue, setRevenue] = useState([])
  const [allPurchases, setAllPurchases] = useState([])
  const [allWithdrawals, setAllWithdrawals] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const channelRef = useRef(null)

  // ─── Date range helper ───────────────────────────────────────────────────
  function getSince(p) {
    const now = new Date()
    if (p === 'Today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    if (p === 'This Week') { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString() }
    if (p === 'This Month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return null
  }

  // ─── Main fetch ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const since = getSince(period)

      // Platform revenue (commissions + practice fees)
      let rq = supabase.from('platform_revenue')
        .select('*, users(id, username, avatar_url)')
        .order('created_at', { ascending: false })
      if (since) rq = rq.gte('created_at', since)
      const { data: revData, error: e1 } = await rq
      if (e1) throw e1

      // All coin purchases (for fiat collected)
      let pq = supabase.from('coin_transactions')
        .select('id, type, amount_tc, amount_fiat, currency, created_at, users(id, username, avatar_url)')
        .eq('type', 'purchase')
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
      if (since) pq = pq.gte('created_at', since)
      const { data: purchaseData, error: e2 } = await pq
      if (e2) throw e2

      // All completed withdrawals — include flutterwave_transfer_fee_fiat
      let wq = supabase.from('withdrawals')
        .select('id, net_fiat, flutterwave_transfer_fee_fiat, currency, status, created_at, users(id, username, avatar_url)')
        .in('status', ['completed', 'processed'])
        .order('created_at', { ascending: false })
      if (since) wq = wq.gte('created_at', since)
      const { data: withdrawalData, error: e3 } = await wq
      if (e3) throw e3

      // Recent activity feed (last 20 across all types)
      const { data: activityData } = await supabase
        .from('coin_transactions')
        .select('id, type, amount_tc, amount_fiat, description, created_at, users(id, username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(20)

      setRevenue(revData ?? [])
      setAllPurchases(purchaseData ?? [])
      setAllWithdrawals(withdrawalData ?? [])
      setRecentActivity(activityData ?? [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Realtime subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    channelRef.current = supabase.channel('admin-revenue-live')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'coin_transactions',
      }, () => fetchAll())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'withdrawals',
      }, () => fetchAll())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'platform_revenue',
      }, () => fetchAll())
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [fetchAll])

  // ─── Derived metrics ─────────────────────────────────────────────────────
  const totalTcSold       = allPurchases.reduce((s, t) => s + (t.amount_tc ?? 0), 0)
  const totalFiatIn       = allPurchases.reduce((s, t) => s + (t.amount_fiat ?? 0), 0)
  const totalFiatOut      = allWithdrawals.reduce((s, w) => s + (w.net_fiat ?? 0), 0)
  // Flutterwave fees paid by Tourena on outgoing transfers
  const totalFlwFees      = allWithdrawals.reduce((s, w) => s + (w.flutterwave_transfer_fee_fiat ?? 0), 0)
  const float             = totalFiatIn - totalFiatOut
  // True net profit = float minus Flutterwave fees already paid
  const netProfit         = float - totalFlwFees
  const safeToWithdraw    = netProfit * 0.6
  const reserve           = netProfit * 0.4

  const playerComm  = revenue.filter(r => r.revenue_type === 'player_withdrawal_commission').reduce((s, r) => s + (r.amount_tc ?? 0), 0)
  const orgComm     = revenue.filter(r => r.revenue_type === 'organizer_withdrawal_commission').reduce((s, r) => s + (r.amount_tc ?? 0), 0)
  const practiceFees = revenue.filter(r => r.revenue_type === 'practice_fee').reduce((s, r) => s + (r.amount_tc ?? 0), 0)
  const totalEarnings = playerComm + orgComm + practiceFees

  // ─── Chart data ──────────────────────────────────────────────────────────
  // Daily fiat in vs fiat out (last 30 days)
  const dailyMap = {}
  allPurchases.forEach(t => {
    const day = new Date(t.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
    if (!dailyMap[day]) dailyMap[day] = { day, fiatIn: 0, fiatOut: 0, tcSold: 0 }
    dailyMap[day].fiatIn += t.amount_fiat ?? 0
    dailyMap[day].tcSold += t.amount_tc ?? 0
  })
  allWithdrawals.forEach(w => {
    const day = new Date(w.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
    if (!dailyMap[day]) dailyMap[day] = { day, fiatIn: 0, fiatOut: 0, tcSold: 0 }
    dailyMap[day].fiatOut += w.net_fiat ?? 0
  })
  const dailyData = Object.values(dailyMap)
    .sort((a, b) => new Date(a.day) - new Date(b.day))
    .slice(-30)

  // Revenue by type for pie
  const pieData = [
    { name: 'Player Commissions', value: playerComm },
    { name: 'Org Commissions', value: orgComm },
    { name: 'Practice Fees', value: practiceFees },
  ].filter(d => d.value > 0)

  // Cumulative TC sold per day (line chart)
  const tcLineData = (() => {
    let running = 0
    return dailyData.map(d => ({ day: d.day, tc: (running += d.tcSold) }))
  })()

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white">Revenue</h1>
          {lastUpdated && (
            <p className="text-xs text-muted mt-0.5">
              Last updated {timeAgo(lastUpdated)} · updates live
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1.5 align-middle" />
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchAll}>Refresh</Button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-6 mt-4">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${period === p ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-white hover:bg-surface2'}`}>
            {p}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center justify-between mb-6">
          <span>{error}</span>
          <Button size="sm" onClick={fetchAll}>Retry</Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <>
          {/* ── Section 1: Money flow ── */}
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Money Flow</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="TC Sold" value={formatTC(totalTcSold)} sub={`${allPurchases.length} purchases`} live />
            <StatCard label="Fiat Collected" value={formatFiat(totalFiatIn, CURRENCY)} sub="from coin purchases" color="text-green-400" live />
            <StatCard label="Fiat Paid Out" value={formatFiat(totalFiatOut, CURRENCY)} sub={`${allWithdrawals.length} withdrawals`} color="text-red-400" live />
            <StatCard label="Gross Float" value={formatFiat(float, CURRENCY)} sub="collected − paid out" color={float >= 0 ? 'text-white' : 'text-red-400'} live />
          </div>

          {/* ── Section 1b: Flutterwave fees ── */}
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Flutterwave Costs</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 border-blue-500/20 bg-blue-500/5">
              <p className="text-xs text-muted mb-1">Flutterwave Fees Paid</p>
              <p className="text-xl font-black text-blue-400">{formatFiat(totalFlwFees, CURRENCY)}</p>
              <p className="text-xs text-muted mt-0.5">Transfer fees on {allWithdrawals.length} payouts</p>
            </Card>
            <Card className="p-4 border-white/10">
              <p className="text-xs text-muted mb-1">NGN Rate</p>
              <p className="text-xl font-black text-white">1.4%</p>
              <p className="text-xs text-muted mt-0.5">Capped at ₦2,000 per transfer</p>
            </Card>
            <Card className="p-4 border-white/10">
              <p className="text-xs text-muted mb-1">International Rate</p>
              <p className="text-xl font-black text-white">3.8%</p>
              <p className="text-xs text-muted mt-0.5">USD / GBP / EUR transfers</p>
            </Card>
          </div>

          {/* ── Section 2: Net profit split ── */}
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Net Profit (after Flutterwave fees)</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 border-white/10">
              <p className="text-xs text-muted mb-1">Net Profit</p>
              <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>{formatFiat(netProfit, CURRENCY)}</p>
              <p className="text-xs text-muted mt-1">Gross float − Flutterwave fees</p>
            </Card>
            <Card className="p-4 border-green-500/20 bg-green-500/5">
              <p className="text-xs text-muted mb-1">Safe to Withdraw (60%)</p>
              <p className="text-2xl font-black text-green-400">{formatFiat(safeToWithdraw, CURRENCY)}</p>
              <p className="text-xs text-muted mt-1">Your personal profit available</p>
            </Card>
            <Card className="p-4 border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-muted mb-1">Reserve Required (40%)</p>
              <p className="text-2xl font-black text-amber-400">{formatFiat(reserve, CURRENCY)}</p>
              <p className="text-xs text-muted mt-1">Keep for pending withdrawals</p>
            </Card>
          </div>

          {/* ── Section 3: Tourena earnings ── */}
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Tourena Earnings (Commissions + Fees)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Player Withdrawal Commissions" value={formatTC(playerComm)} live />
            <StatCard label="Organizer Withdrawal Commissions" value={formatTC(orgComm)} live />
            <StatCard label="Practice Tournament Fees" value={formatTC(practiceFees)} live />
            <StatCard label="Total Tourena Earnings" value={formatTC(totalEarnings)} highlight live />
          </div>
        </>
      )}

      {/* ── Charts ── */}
      {!loading && dailyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Fiat in vs out bar chart */}
          <Card className="p-4">
            <h3 className="text-sm font-bold text-white mb-4">Fiat In vs Fiat Out (per day)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} barGap={2}>
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v, name) => [formatFiat(v, CURRENCY), name]}
                />
                <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 11 }} />
                <Bar dataKey="fiatIn" name="Fiat In" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="fiatOut" name="Fiat Out" fill="#EF4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Cumulative TC sold line */}
          <Card className="p-4">
            <h3 className="text-sm font-bold text-white mb-4">Cumulative TC Sold</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tcLineData}>
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v) => [formatTC(v), 'TC Sold']}
                />
                <Line type="monotone" dataKey="tc" stroke="#7C3AED" strokeWidth={2} dot={false} name="TC Sold" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Revenue breakdown pie */}
          {pieData.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-bold text-white mb-4">Revenue Breakdown by Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v) => [formatTC(v), '']}
                  />
                  <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Live activity feed */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Live Activity Feed</h3>
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                live
              </span>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-muted text-sm text-center py-4">No activity yet</p>
              ) : recentActivity.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {tx.users && <Avatar user={tx.users} size={24} />}
                    <div className="min-w-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TX_TYPE_COLORS[tx.type] ?? 'bg-gray-600 text-gray-200'}`}>
                        {tx.type?.replace(/_/g, ' ')}
                      </span>
                      <p className="text-xs text-muted truncate mt-0.5">{timeAgo(tx.created_at)}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ml-2 ${tx.amount_tc > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount_tc > 0 ? '+' : ''}{formatTC(tx.amount_tc)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Platform Revenue Transactions table ── */}
      <Card>
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Revenue Transactions</h2>
          <span className="text-xs text-muted">{revenue.length} records</span>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))
          ) : revenue.length === 0 ? (
            <div className="text-center py-12 text-muted">No revenue recorded yet</div>
          ) : revenue.map(r => (
            <div key={r.id} className="flex items-center justify-between p-4 hover:bg-surface2 transition-colors">
              <div className="flex items-center gap-3">
                {r.users && <Avatar user={r.users} size={32} showName />}
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TX_TYPE_COLORS[r.revenue_type] ?? 'bg-gray-600 text-gray-200'}`}>
                    {r.revenue_type?.replace(/_/g, ' ')}
                  </span>
                  <p className="text-xs text-muted mt-0.5">{formatDateTime(r.created_at)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-accent font-bold text-sm">{formatTC(r.amount_tc ?? 0)}</p>
                {r.amount_fiat > 0 && (
                  <p className="text-xs text-muted">{formatFiat(r.amount_fiat, r.currency ?? CURRENCY)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageWrapper>
  )
}
