import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, getCountryFlag, winRate } from '../../lib/utils'
import { GAME_TYPES } from '../../lib/constants'

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ gameType: '', period: 'all' })

  useEffect(() => { fetchLeaderboard() }, [filters])

  async function fetchLeaderboard() {
    setLoading(true)
    const { data } = await supabase
      .from('player_stats')
      .select('*, users(id, username, avatar_url, country, role)')
      .order('tournaments_won', { ascending: false })
      .limit(50)
    setPlayers(data?.filter(p => p.users) ?? [])
    setLoading(false)
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <PageWrapper>
      <h1 className="text-3xl font-black text-white mb-6">🏆 Leaderboard</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filters.gameType} onChange={e => setFilters(p => ({ ...p, gameType: e.target.value }))}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="">All Game Types</option>
          {GAME_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select value={filters.period} onChange={e => setFilters(p => ({ ...p, period: e.target.value }))}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
        </select>
      </div>

      <Card>
        <div className="divide-y divide-white/[0.06]">
          {loading ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <div className="ml-auto flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))
          ) : players.length === 0 ? (
            <div className="text-center py-12 text-muted">No players yet</div>
          ) : players.map((p, i) => {
            const isTop3 = i < 3
            const wr = winRate(p.tournaments_won, p.tournaments_played)
            return (
              <div key={p.id} className={`flex items-center gap-4 p-4 hover:bg-surface2 transition-colors ${isTop3 ? 'bg-primary/5' : ''}`}>
                <div className="w-8 text-center">
                  {isTop3 ? <span className="text-xl">{medals[i]}</span> : <span className="text-muted text-sm font-bold">{i + 1}</span>}
                </div>
                <Avatar user={p.users} size={36} showName />
                <span className="text-sm">{getCountryFlag(p.users?.country)}</span>
                {isTop3 && <Badge color="purple">Recommended</Badge>}
                <div className="ml-auto flex items-center gap-6 text-sm">
                  <div className="text-right hidden sm:block">
                    <p className="text-white font-bold">{p.tournaments_won ?? 0}</p>
                    <p className="text-xs text-muted">Wins</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-accent font-bold">🪙 {formatTC(p.total_tc_earned ?? 0)}</p>
                    <p className="text-xs text-muted">TC Earned</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{wr}%</p>
                    <p className="text-xs text-muted">Win Rate</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </PageWrapper>
  )
}
