import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatTC, timeAgo } from '../../lib/utils'
import toast from 'react-hot-toast'

const StatCard = ({ icon, label, value, color = 'text-white', link, urgent, sub }) => {
  const inner = (
    <div className={`bg-surface border rounded-xl p-4 transition-colors ${urgent ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10'} ${link ? 'hover:border-primary/40' : ''}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted/70 mt-1">{sub}</div>}
      {urgent && <div className="text-xs text-amber-400 mt-1 font-semibold">Needs attention →</div>}
    </div>
  )
  return link ? <Link to={link}>{inner}</Link> : inner
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [gifts, setGifts] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('activity')

  const fetchStats = useCallback(async () => {
    try {
      const [
        { count: totalUsers },
        { count: pendingUsers },
        { count: approvedUsers },
        { count: suspendedUsers },
        { count: activeTournaments },
        { count: pendingReviews },
        { count: completedTournaments },
        { count: pendingWithdrawals },
        { count: totalCommunities },
        { count: totalGroups },
        { count: pendingReports },
        { data: txData },
        { data: recentActivity },
        { data: recentGifts },
        { data: recentReports },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('account_status', 'pending'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('account_status', 'approved'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('account_status', 'suspended'),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }).in('status', ['approved','ongoing']),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('communities').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('groups').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('coin_transactions').select('amount_tc').eq('type', 'purchase').eq('status', 'confirmed'),
        supabase.from('coin_transactions').select('*, users!coin_transactions_user_id_fkey(username, avatar_url)').order('created_at', { ascending: false }).limit(20),
        supabase.from('coin_gifts').select('*, sender:sender_id(username, avatar_url), receiver:receiver_id(username)').order('created_at', { ascending: false }).limit(10),
        supabase.from('reports').select('*, reporter:reporter_id(username)').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
      ])

      const totalTcCirculation = txData?.reduce((s, t) => s + (t.amount_tc ?? 0), 0) ?? 0
      setStats({ totalUsers, pendingUsers, approvedUsers, suspendedUsers, activeTournaments, pendingReviews, completedTournaments, pendingWithdrawals, totalCommunities, totalGroups, pendingReports, totalTcCirculation })
      setActivity(recentActivity ?? [])
      setGifts(recentGifts ?? [])
      setReports(recentReports ?? [])
      setError(null)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    const ch = supabase.channel('admin-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coin_transactions' }, fetchStats)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, fetchStats)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, fetchStats)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchStats])

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
      <div className="text-5xl">⚠️</div>
      <p className="text-white font-bold">Failed to load dashboard</p>
      <p className="text-muted text-sm">{error}</p>
      <button onClick={fetchStats} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">Retry</button>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <button onClick={fetchStats} className="text-sm text-muted hover:text-white bg-surface2 px-3 py-1.5 rounded-lg transition-colors">↻ Refresh</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array(12).fill(0).map((_, i) => <div key={i} className="h-24 bg-surface border border-white/10 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Users row */}
          <p className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">Users</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatCard icon="👥" label="Total Users" value={stats.totalUsers} />
            <StatCard icon="⏳" label="Pending Approval" value={stats.pendingUsers} color="text-amber-400" link="/admin/users" urgent={stats.pendingUsers > 0} />
            <StatCard icon="✅" label="Approved Users" value={stats.approvedUsers} color="text-green-400" />
            <StatCard icon="🚫" label="Suspended" value={stats.suspendedUsers} color="text-red-400" link="/admin/users" />
          </div>

          {/* Tournaments row */}
          <p className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">Tournaments</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatCard icon="🎮" label="Active" value={stats.activeTournaments} color="text-green-400" />
            <StatCard icon="🔍" label="Pending Review" value={stats.pendingReviews} color="text-amber-400" link="/admin/tournaments" urgent={stats.pendingReviews > 0} />
            <StatCard icon="🏆" label="Completed" value={stats.completedTournaments} color="text-primary" />
            <StatCard icon="💸" label="Pending Withdrawals" value={stats.pendingWithdrawals} color="text-red-400" link="/admin/withdrawals" urgent={stats.pendingWithdrawals > 0} />
          </div>

          {/* Community & Finance row */}
          <p className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">Community & Finance</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon="🏘️" label="Communities" value={stats.totalCommunities} color="text-blue-400" link="/admin/communities" />
            <StatCard icon="👾" label="Groups" value={stats.totalGroups} color="text-purple-400" link="/admin/communities" />
            <StatCard icon="🚨" label="Pending Reports" value={stats.pendingReports} color="text-red-400" link="/admin/reports" urgent={stats.pendingReports > 0} />
            <StatCard icon="🪙" label="TC in Circulation" value={formatTC(stats.totalTcCirculation)} color="text-accent" />
          </div>
        </>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { to: '/admin/users', label: '👥 Users' },
          { to: '/admin/tournaments', label: '🎮 Tournaments' },
          { to: '/admin/withdrawals', label: '💸 Withdrawals' },
          { to: '/admin/revenue', label: '💰 Revenue' },
          { to: '/admin/transactions', label: '📋 Transactions' },
          { to: '/admin/communities', label: '🏘️ Communities' },
          { to: '/admin/reports', label: '🚨 Reports' },
          { to: '/admin/sponsors', label: '📢 Sponsors' },
          { to: '/admin/events', label: '📅 Events' },
          { to: '/admin/news', label: '📰 News' },
          { to: '/admin/settings', label: '⚙️ Settings' },
        ].map(a => (
          <Link key={a.to} to={a.to} className="bg-surface2 hover:bg-surface border border-white/10 hover:border-primary/30 text-white text-sm px-3 py-2 rounded-lg transition-colors">
            {a.label}
          </Link>
        ))}
      </div>

      {/* Tabbed feed */}
      <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
        <div className="flex border-b border-white/10">
          {[['activity','Live Activity'],['gifts','Coin Gifts'],['reports','Reports']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${tab === key ? 'text-white border-b-2 border-primary' : 'text-muted hover:text-white'}`}>
              {label}
              {key === 'reports' && stats?.pendingReports > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{stats.pendingReports}</span>
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center pr-4 gap-1.5 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live
          </div>
        </div>

        {tab === 'activity' && (
          <div className="divide-y divide-white/[0.06]">
            {activity.length === 0 ? <div className="text-center py-12 text-muted">No activity yet</div>
              : activity.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface2 transition-colors">
                <div className="flex items-center gap-3">
                  {tx.users?.avatar_url
                    ? <img src={tx.users.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                    : <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-white">{tx.users?.username?.slice(0,2).toUpperCase() ?? '??'}</div>
                  }
                  <div>
                    <p className="text-sm text-white">{tx.users?.username ?? 'Unknown'} · <span className="text-muted">{tx.description}</span></p>
                    <p className="text-xs text-muted">{timeAgo(tx.created_at)}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.amount_tc > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.amount_tc > 0 ? '+' : ''}{formatTC(tx.amount_tc)}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'gifts' && (
          <div className="divide-y divide-white/[0.06]">
            {gifts.length === 0 ? <div className="text-center py-12 text-muted">No gifts yet</div>
              : gifts.map(g => (
              <div key={g.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface2 transition-colors">
                <div className="flex items-center gap-3">
                  {g.sender?.avatar_url
                    ? <img src={g.sender.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                    : <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-white">{g.sender?.username?.slice(0,2).toUpperCase() ?? '??'}</div>
                  }
                  <div>
                    <p className="text-sm text-white">
                      <span className="font-medium">{g.sender?.username}</span>
                      <span className="text-muted"> → </span>
                      <span className="font-medium">{g.receiver?.username}</span>
                    </p>
                    {g.message && <p className="text-xs text-muted italic">"{g.message}"</p>}
                    <p className="text-xs text-muted">{timeAgo(g.created_at)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-accent">🎁 {formatTC(g.amount_tc)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'reports' && (
          <div className="divide-y divide-white/[0.06]">
            {reports.length === 0 ? <div className="text-center py-12 text-muted">No pending reports</div>
              : reports.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface2 transition-colors">
                <div>
                  <p className="text-sm text-white">
                    <span className="font-medium">{r.reporter?.username}</span>
                    <span className="text-muted"> reported </span>
                    <span className="text-red-400 capitalize">{r.target_type}</span>
                  </p>
                  <p className="text-xs text-muted capitalize">{r.reason}{r.details ? ` — ${r.details}` : ''}</p>
                  <p className="text-xs text-muted">{timeAgo(r.created_at)}</p>
                </div>
                <Link to="/admin/reports" className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors">Review</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
