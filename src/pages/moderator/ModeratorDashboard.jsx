import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { timeAgo } from '../../lib/utils'
import toast from 'react-hot-toast'

function StatCard({ icon, label, value, color = 'text-white', link, urgent }) {
  const inner = (
    <div className={`bg-surface border rounded-xl p-4 transition-colors ${urgent ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10'} ${link ? 'hover:border-primary/40' : ''}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
      {urgent && <div className="text-xs text-amber-400 mt-1 font-semibold">Needs attention →</div>}
    </div>
  )
  return link ? <Link to={link}>{inner}</Link> : inner
}

export default function ModeratorDashboard() {
  const { profile } = useAuth()
  const perms = profile?.moderator_permissions ?? {}
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const queries = []

        if (perms.review_tournaments) {
          queries.push(
            supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
            supabase.from('tournaments').select('*', { count: 'exact', head: true }).in('status', ['approved','ongoing'])
          )
        }
        if (perms.manage_users) {
          queries.push(
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('account_status', 'pending'),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('account_status', 'suspended')
          )
        }
        if (perms.manage_reports) {
          queries.push(
            supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
          )
        }
        if (perms.manage_communities) {
          queries.push(
            supabase.from('communities').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('groups').select('*', { count: 'exact', head: true }).eq('status', 'active')
          )
        }

        // Recent activity — tournaments and users they can act on
        const activityQuery = perms.review_tournaments
          ? supabase.from('tournaments').select('id, title, status, created_at').eq('status', 'pending_approval').order('created_at', { ascending: false }).limit(8)
          : perms.manage_users
          ? supabase.from('users').select('id, username, account_status, created_at').eq('account_status', 'pending').order('created_at', { ascending: false }).limit(8)
          : null

        const results = await Promise.all(queries)
        const activityResult = activityQuery ? await activityQuery : null

        let idx = 0
        const s = {}
        if (perms.review_tournaments) { s.pendingTournaments = results[idx++]?.count ?? 0; s.activeTournaments = results[idx++]?.count ?? 0 }
        if (perms.manage_users) { s.pendingUsers = results[idx++]?.count ?? 0; s.suspendedUsers = results[idx++]?.count ?? 0 }
        if (perms.manage_reports) { s.pendingReports = results[idx++]?.count ?? 0 }
        if (perms.manage_communities) { s.communities = results[idx++]?.count ?? 0; s.groups = results[idx++]?.count ?? 0 }

        setStats(s)
        setActivity(activityResult?.data ?? [])
      } catch (err) {
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const PERM_LABELS = {
    review_tournaments: '🎮 Tournament Reviewer',
    manage_users: '👥 User Manager',
    manage_reports: '🚨 Report Reviewer',
    manage_communities: '🏘️ Community Manager',
    manage_news: '📰 News Editor',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5 mb-6 flex items-center gap-4">
        {profile?.avatar_url
          ? <img src={profile.avatar_url} className="w-14 h-14 rounded-full object-cover" alt="" />
          : <div className="w-14 h-14 rounded-full bg-primary/30 flex items-center justify-center text-xl font-bold text-white">{profile?.username?.slice(0,2).toUpperCase()}</div>
        }
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{profile?.username}</h1>
            <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">Moderator</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(perms).filter(([,v]) => v).map(([k]) => (
              <span key={k} className="text-xs bg-surface2 text-muted px-2 py-0.5 rounded-full">{PERM_LABELS[k] ?? k}</span>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-surface border border-white/10 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {perms.review_tournaments && <>
            <StatCard icon="🔍" label="Pending Reviews" value={stats?.pendingTournaments ?? 0} color="text-amber-400" link="/mod/tournaments" urgent={(stats?.pendingTournaments ?? 0) > 0} />
            <StatCard icon="🎮" label="Active Tournaments" value={stats?.activeTournaments ?? 0} color="text-green-400" />
          </>}
          {perms.manage_users && <>
            <StatCard icon="⏳" label="Pending Users" value={stats?.pendingUsers ?? 0} color="text-amber-400" link="/mod/users" urgent={(stats?.pendingUsers ?? 0) > 0} />
            <StatCard icon="🚫" label="Suspended Users" value={stats?.suspendedUsers ?? 0} color="text-red-400" />
          </>}
          {perms.manage_reports && (
            <StatCard icon="🚨" label="Pending Reports" value={stats?.pendingReports ?? 0} color="text-red-400" link="/mod/reports" urgent={(stats?.pendingReports ?? 0) > 0} />
          )}
          {perms.manage_communities && <>
            <StatCard icon="🏘️" label="Communities" value={stats?.communities ?? 0} color="text-blue-400" link="/mod/communities" />
            <StatCard icon="👾" label="Groups" value={stats?.groups ?? 0} color="text-purple-400" />
          </>}
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 mb-6">
        {perms.review_tournaments && <Link to="/mod/tournaments" className="bg-surface2 hover:bg-surface border border-white/10 hover:border-primary/30 text-white text-sm px-3 py-2 rounded-lg transition-colors">🎮 Review Tournaments</Link>}
        {perms.manage_users && <Link to="/mod/users" className="bg-surface2 hover:bg-surface border border-white/10 hover:border-primary/30 text-white text-sm px-3 py-2 rounded-lg transition-colors">👥 Manage Users</Link>}
        {perms.manage_reports && <Link to="/mod/reports" className="bg-surface2 hover:bg-surface border border-white/10 hover:border-primary/30 text-white text-sm px-3 py-2 rounded-lg transition-colors">🚨 Reports</Link>}
        {perms.manage_communities && <Link to="/mod/communities" className="bg-surface2 hover:bg-surface border border-white/10 hover:border-primary/30 text-white text-sm px-3 py-2 rounded-lg transition-colors">🏘️ Communities</Link>}
        {perms.manage_news && <Link to="/mod/news" className="bg-surface2 hover:bg-surface border border-white/10 hover:border-primary/30 text-white text-sm px-3 py-2 rounded-lg transition-colors">📰 News & Events</Link>}
      </div>

      {/* Activity feed */}
      {activity.length > 0 && (
        <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">
              {perms.review_tournaments ? 'Pending Tournament Submissions' : 'Pending User Approvals'}
            </h2>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {activity.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface2 transition-colors">
                <div>
                  <p className="text-sm text-white">{item.title ?? item.username}</p>
                  <p className="text-xs text-muted">{timeAgo(item.created_at)}</p>
                </div>
                <Link
                  to={perms.review_tournaments ? '/mod/tournaments' : '/mod/users'}
                  className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-colors">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
