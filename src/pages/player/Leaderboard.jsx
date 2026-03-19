import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, getCountryFlag, winRate, getPlayerStars, getStreakTier } from '../../lib/utils'
import { COUNTRIES } from '../../lib/constants'

const MEDALS = ['🥇', '🥈', '🥉']
const RANK_COLORS = ['text-amber-400', 'text-slate-300', 'text-amber-600']

function Stars({ won = 0, played = 0 }) {
  const n = getPlayerStars(won, played)
  return (
    <span className="flex items-center gap-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-xs leading-none ${i < n ? 'text-amber-400' : 'text-white/15'}`}>★</span>
      ))}
    </span>
  )
}

function StreakPill({ streak = 0 }) {
  const tier = getStreakTier(streak)
  if (!tier) return null
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${tier.bg} ${tier.color}`}>
      {tier.icon}{streak}
    </span>
  )
      <h1 className="text-3xl font-black text-white mb-6">Leaderboard</h1>

function Avatar({ user, size = 36 }) {
  const s = `${size}px`
  if (user?.avatar_url)
    return <img src={user.avatar_url} style={{ width: s, height: s }} className="rounded-full object-cover border border-white/10 flex-shrink-0" alt="" />
  return (
    <div style={{ width: s, height: s }} className="rounded-full bg-primary/30 border border-primary/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
      {(user?.username ?? '?').slice(0, 2).toUpperCase()}
    </div>
  )
}

function LoadingRows() {
  return Array.from({ length: 8 }).map((_, i) => (
    <div key={i} className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-8 h-5 rounded" />
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28 rounded" />
        <Skeleton className="h-2.5 w-16 rounded" />
      </div>
      <Skeleton className="h-4 w-16 rounded" />
    </div>
  ))
}

// ── Player row (global / country tabs) ───────────────────────
function PlayerRow({ rank, player, metric, myId, showCountry }) {
  const u = player.users
  const isMe = u?.id === myId
  const isTop3 = rank <= 3
  const wr = winRate(player.tournaments_won, player.tournaments_played)

  return (
    <Link to={`/profile/${u?.username}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-surface2 transition-colors ${isTop3 ? 'bg-primary/5' : ''} ${isMe ? 'ring-1 ring-inset ring-primary/40' : ''}`}>
      <div className="w-8 flex-shrink-0 text-center">
        {isTop3 ? <span className="text-xl">{MEDALS[rank - 1]}</span>
          : <span className={`text-sm font-bold ${isMe ? 'text-primary' : 'text-muted'}`}>{rank}</span>}
      </div>
      <Avatar user={u} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : 'text-white'}`}>{u?.username}</span>
          {isMe && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">You</span>}
          {showCountry && <span className="text-sm">{getCountryFlag(u?.country)}</span>}
          <StreakPill streak={player.current_win_streak ?? 0} />
        </div>
        <Stars won={player.tournaments_won} played={player.tournaments_played} />
      </div>
      <div className="flex items-center gap-4 text-right flex-shrink-0">
        <div className="hidden md:block">
          <p className="text-xs text-white font-semibold">{player.tournaments_played ?? 0}</p>
          <p className="text-[10px] text-muted">Played</p>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs text-white font-semibold">{wr}%</p>
          <p className="text-[10px] text-muted">Win Rate</p>
        </div>
        <div>
          <p className={`text-sm font-black ${isTop3 ? RANK_COLORS[rank - 1] : 'text-white'}`}>{metric.value}</p>
          <p className="text-[10px] text-muted">{metric.label}</p>
        </div>
      </div>
    </Link>
  )
}

// ── Match row ─────────────────────────────────────────────────
function MatchRow({ rank, row, myId }) {
  const u = row.users
  const isMe = u?.id === myId
  const isTop3 = rank <= 3
  const mwr = row.matches_played > 0 ? Math.round((row.matches_won / row.matches_played) * 100) : 0

  return (
    <Link to={`/profile/${u?.username}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-surface2 transition-colors ${isTop3 ? 'bg-primary/5' : ''} ${isMe ? 'ring-1 ring-inset ring-primary/40' : ''}`}>
      <div className="w-8 flex-shrink-0 text-center">
        {isTop3 ? <span className="text-xl">{MEDALS[rank - 1]}</span>
          : <span className="text-sm font-bold text-muted">{rank}</span>}
      </div>
      <Avatar user={u} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : 'text-white'}`}>{u?.username}</span>
          {isMe && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">You</span>}
        </div>
        <p className="text-[10px] text-muted">{row.top_game ?? 'All Games'}</p>
      </div>
      <div className="flex items-center gap-4 text-right flex-shrink-0">
        <div className="hidden md:block">
          <p className="text-xs text-white font-semibold">{row.matches_played}</p>
          <p className="text-[10px] text-muted">Matches</p>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs text-white font-semibold">{mwr}%</p>
          <p className="text-[10px] text-muted">Win Rate</p>
        </div>
        <div>
          <p className={`text-sm font-black ${isTop3 ? RANK_COLORS[rank - 1] : 'text-white'}`}>{row.matches_won}</p>
          <p className="text-[10px] text-muted">Wins</p>
        </div>
      </div>
    </Link>
  )
} 

// ── Tournament row ────────────────────────────────────────────
function TournamentRow({ rank, row }) {
  const isTop3 = rank <= 3
  return (
    <Link to={`/tournament/${row.id}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-surface2 transition-colors ${isTop3 ? 'bg-primary/5' : ''}`}>
      <div className="w-8 flex-shrink-0 text-center">
        {isTop3 ? <span className="text-xl">{MEDALS[rank - 1]}</span>
          : <span className="text-sm font-bold text-muted">{rank}</span>}
      </div>
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface2 flex-shrink-0">
        {row.thumbnail_url
          ? <img src={row.thumbnail_url} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full flex items-center justify-center text-lg">🎮</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{row.title}</p>
        <p className="text-[10px] text-muted">{row.game_name}</p>
      </div>
      <div className="flex items-center gap-4 text-right flex-shrink-0">
        <div className="hidden sm:block">
          <p className="text-xs text-white font-semibold">{row.current_participants}/{row.max_participants}</p>
          <p className="text-[10px] text-muted">Players</p>
        </div>
        <div>
          <p className={`text-sm font-black ${isTop3 ? RANK_COLORS[rank - 1] : 'text-accent'}`}>🪙 {formatTC(row.prize_pool_tc ?? 0)}</p>
          <p className="text-[10px] text-muted">Prize Pool</p>
        </div>
      </div>
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function Leaderboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('global')
  const [sortBy, setSortBy] = useState('wins')
  const [country, setCountry] = useState('')
  const [game, setGame] = useState('')
  const [players, setPlayers] = useState([])
  const [matchRows, setMatchRows] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState([])

  useEffect(() => {
    supabase.from('tournaments').select('game_name').eq('status', 'completed').then(({ data }) => {
      setGames([...new Set((data ?? []).map(t => t.game_name).filter(Boolean))].sort())
    })
  }, [])

  const fetchGlobal = useCallback(async () => {
    setLoading(true)
    const orderCol = sortBy === 'tc' ? 'total_tc_earned' : sortBy === 'streak' ? 'longest_win_streak' : 'tournaments_won'
    const { data } = await supabase
      .from('player_stats')
      .select('*, users(id, username, avatar_url, country)')
      .gt('tournaments_played', 0)
      .order(orderCol, { ascending: false })
      .limit(200)
    let rows = (data ?? []).filter(p => p.users)
    if (country) rows = rows.filter(p => p.users?.country === country)
    if (sortBy === 'rate') rows = rows.sort((a, b) => winRate(b.tournaments_won, b.tournaments_played) - winRate(a.tournaments_won, a.tournaments_played))
    setPlayers(rows.slice(0, 50))
    if (profile) {
      const idx = rows.findIndex(p => p.users?.id === profile.id)
      setMyRank(idx >= 0 ? idx + 1 : null)
    }
    setLoading(false)
  }, [sortBy, country, profile])

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    const { data: wins } = await supabase.from('matches')
      .select('winner_id, tournaments(game_name)').eq('status', 'completed').not('winner_id', 'is', null).limit(5000)
    const { data: played } = await supabase.from('matches')
      .select('player1_id, player2_id').eq('status', 'completed').limit(5000)

    const winMap = {}, playedMap = {}, gameMap = {}
    ;(wins ?? []).forEach(m => {
      const id = m.winner_id, g = m.tournaments?.game_name ?? ''
      winMap[id] = (winMap[id] ?? 0) + 1
      if (!gameMap[id]) gameMap[id] = {}
      gameMap[id][g] = (gameMap[id][g] ?? 0) + 1
    })
    ;(played ?? []).forEach(m => {
      if (m.player1_id) playedMap[m.player1_id] = (playedMap[m.player1_id] ?? 0) + 1
      if (m.player2_id) playedMap[m.player2_id] = (playedMap[m.player2_id] ?? 0) + 1
    })

    const ids = Object.keys(winMap)
    if (!ids.length) { setMatchRows([]); setLoading(false); return }

    const { data: users } = await supabase.from('users').select('id, username, avatar_url, country').in('id', ids)
    const uMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))

    let rows = ids.map(id => {
      const topGame = Object.entries(gameMap[id] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      const mw = game
        ? (wins ?? []).filter(m => m.winner_id === id && m.tournaments?.game_name === game).length
        : winMap[id] ?? 0
      return { user_id: id, users: uMap[id], matches_won: mw, matches_played: playedMap[id] ?? 0, top_game: topGame }
    }).filter(r => r.users && r.matches_won > 0)

    rows.sort((a, b) => b.matches_won - a.matches_won)
    setMatchRows(rows.slice(0, 50))
    setLoading(false)
  }, [game])

  const fetchTournaments = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('tournaments')
      .select('id, title, game_name, thumbnail_url, prize_pool_tc, current_participants, max_participants, status')
      .in('status', ['completed', 'ongoing'])
      .order('prize_pool_tc', { ascending: false })
      .limit(50)
    if (game) q = q.eq('game_name', game)
    const { data } = await q
    setTournaments(data ?? [])
    setLoading(false)
  }, [game])

  useEffect(() => {
    if (tab === 'global' || tab === 'country') fetchGlobal()
    else if (tab === 'matches') fetchMatches()
    else if (tab === 'tournaments') fetchTournaments()
  }, [tab, fetchGlobal, fetchMatches, fetchTournaments])

  const TABS = [
    { id: 'global', label: '🌍 Global' },
    { id: 'country', label: '🏳️ Country' },
    { id: 'matches', label: '⚔️ Matches' },
    { id: 'tournaments', label: '🏆 Tournaments' },
  ]
  const SORT_OPTS = [
    { value: 'wins', label: 'Most Wins' },
    { value: 'tc', label: 'TC Earned' },
    { value: 'rate', label: 'Win Rate' },
    { value: 'streak', label: 'Best Streak' },
  ]

  const myStats = players.find(p => p.users?.id === profile?.id)
  const isPlayerTab = tab === 'global' || tab === 'country'

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-black text-white">🏆 Leaderboard</h1>
        {myRank && isPlayerTab && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-center">
            <p className="text-[10px] text-muted">Your Rank</p>
            <p className="text-xl font-black text-primary">#{myRank}</p>
          </div>
        )}
      </div>

      {/* My stats banner */}
      {myStats && isPlayerTab && (
        <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar user={profile} size={40} />
              <div>
                <p className="text-sm font-bold text-white">{profile?.username}</p>
                <Stars won={myStats.tournaments_won} played={myStats.tournaments_played} />
              </div>
            </div>
            <div className="flex gap-5 ml-auto flex-wrap">
              {[
                { label: 'Rank', value: myRank ? `#${myRank}` : '—' },
                { label: 'Wins', value: myStats.tournaments_won ?? 0 },
                { label: 'Win Rate', value: `${winRate(myStats.tournaments_won, myStats.tournaments_played)}%` },
                { label: 'Streak 🔥', value: myStats.current_win_streak ?? 0 },
                { label: 'TC Earned', value: formatTC(myStats.total_tc_earned ?? 0) },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-sm font-black text-white">{s.value}</p>
                  <p className="text-[10px] text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-white/[0.08] overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {isPlayerTab && (
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {tab === 'country' && (
          <select value={country} onChange={e => setCountry(e.target.value)}
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
            <option value="">All Countries</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        )}
        {(tab === 'matches' || tab === 'tournaments') && games.length > 0 && (
          <select value={game} onChange={e => setGame(e.target.value)}
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
            <option value="">All Games</option>
            {games.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
      </div>

      {/* Column headers */}
      {isPlayerTab && (
        <div className="flex items-center gap-3 px-4 py-2 text-[10px] text-muted uppercase tracking-wider border-b border-white/[0.06]">
          <span className="w-8">#</span><span className="w-9" />
          <span className="flex-1">Player</span>
          <span className="hidden md:block w-12 text-right">Played</span>
          <span className="hidden sm:block w-14 text-right">Win Rate</span>
          <span className="w-20 text-right">{SORT_OPTS.find(o => o.value === sortBy)?.label}</span>
        </div>
      )}
      {tab === 'matches' && (
        <div className="flex items-center gap-3 px-4 py-2 text-[10px] text-muted uppercase tracking-wider border-b border-white/[0.06]">
          <span className="w-8">#</span><span className="w-9" />
          <span className="flex-1">Player</span>
          <span className="hidden md:block w-16 text-right">Matches</span>
          <span className="hidden sm:block w-14 text-right">Win Rate</span>
          <span className="w-12 text-right">Wins</span>
        </div>
      )}
      {tab === 'tournaments' && (
        <div className="flex items-center gap-3 px-4 py-2 text-[10px] text-muted uppercase tracking-wider border-b border-white/[0.06]">
          <span className="w-8">#</span><span className="w-10" />
          <span className="flex-1">Tournament</span>
          <span className="hidden sm:block w-20 text-right">Players</span>
          <span className="w-24 text-right">Prize Pool</span>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="divide-y divide-white/[0.06]">
          {loading ? <LoadingRows /> : (
            <>
              {isPlayerTab && (players.length === 0
                ? <div className="text-center py-16 text-muted">No players yet</div>
                : players.map((p, i) => {
                    const metricMap = {
                      wins:   { value: p.tournaments_won ?? 0, label: 'Wins' },
                      tc:     { value: formatTC(p.total_tc_earned ?? 0), label: 'TC Earned' },
                      rate:   { value: `${winRate(p.tournaments_won, p.tournaments_played)}%`, label: 'Win Rate' },
                      streak: { value: p.longest_win_streak ?? 0, label: 'Best Streak' },
                    }
                    return <PlayerRow key={p.id} rank={i + 1} player={p} metric={metricMap[sortBy]} myId={profile?.id} showCountry={tab === 'global'} />
                  })
              )}
              {tab === 'matches' && (matchRows.length === 0
                ? <div className="text-center py-16 text-muted">No match data yet</div>
                : matchRows.map((r, i) => <MatchRow key={r.user_id} rank={i + 1} row={r} myId={profile?.id} />)
              )}
              {tab === 'tournaments' && (tournaments.length === 0
                ? <div className="text-center py-16 text-muted">No tournaments yet</div>
                : tournaments.map((t, i) => <TournamentRow key={t.id} rank={i + 1} row={t} />)
              )}
            </>
          )}
        </div>
      </Card>

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted">
        <span>⚡ 1+ streak</span>
        <span>🔥 3+ On Fire</span>
        <span>🔥 5+ Unstoppable</span>
        <span>🔥 10+ Legendary</span>
        <span className="ml-2">★ = skill rating (1–5 stars)</span>
      </div>
    </PageWrapper>
  )
}
