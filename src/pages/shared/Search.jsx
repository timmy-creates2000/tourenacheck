import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Users, Trophy, Globe } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { getCountryFlag } from '../../lib/utils'
import { GAME_NAMES, GAME_CATEGORIES, GAME_PLATFORMS, GAMES } from '../../lib/games'
import { VerifiedBadge } from '../../components/ui/Avatar'

function UserAvatar({ user, size = 36 }) {
  const s = `${size}px`
  if (user?.avatar_url) return <img src={user.avatar_url} style={{ width: s, height: s }} className="rounded-full object-cover flex-shrink-0" alt="" />
  return <div style={{ width: s, height: s }} className="rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{(user?.username ?? '?').slice(0, 2).toUpperCase()}</div>
}

const TABS = [
  { key: 'players',     label: 'Players',     icon: Users },
  { key: 'tournaments', label: 'Tournaments', icon: Trophy },
  { key: 'communities', label: 'Communities', icon: Globe },
]

const PLATFORM_LABELS = {
  mobile: 'Mobile', pc: 'PC', console: 'Console',
  cross_platform: 'Cross-Platform', board: 'Board / Card', sports: 'Sports', other: 'Other',
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [tab, setTab] = useState('players')
  const [results, setResults] = useState({ players: [], tournaments: [], communities: [] })
  const [loading, setLoading] = useState(false)

  // Game filters (tournaments tab)
  const [gameFilter, setGameFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [gameSearch, setGameSearch] = useState('')

  const doSearch = useCallback(async (q, game, platform, category) => {
    if (!q.trim() && !game && !platform && !category) {
      setResults({ players: [], tournaments: [], communities: [] })
      return
    }
    setLoading(true)
    const term = q.trim() ? `%${q.trim()}%` : null

    // Players
    let pq = supabase.from('users')
      .select('id,username,display_name,avatar_url,country,role,is_verified,favourite_game')
      .eq('account_status', 'approved')
      .limit(20)
    if (term) pq = pq.or(`username.ilike.${term},display_name.ilike.${term}`)
    if (game) pq = pq.ilike('favourite_game', `%${game}%`)

    // Tournaments
    let tq = supabase.from('tournaments')
      .select('id,title,game_name,game_type,status,entry_fee_tc,prize_pool_tc,thumbnail_url,is_practice')
      .in('status', ['published', 'ongoing', 'approved'])
      .limit(30)
    if (term) tq = tq.or(`title.ilike.${term},game_name.ilike.${term}`)
    if (game) tq = tq.ilike('game_name', `%${game}%`)
    if (platform) tq = tq.eq('game_type', platform)

    // Communities
    let cq = supabase.from('communities')
      .select('id,name,slug,description,avatar_url,member_count,game_focus')
      .eq('status', 'active')
      .limit(20)
    if (term) cq = cq.or(`name.ilike.${term},description.ilike.${term}`)
    if (game) cq = cq.ilike('game_focus', `%${game}%`)

    const [{ data: players }, { data: tournaments }, { data: communities }] = await Promise.all([pq, tq, cq])
    setResults({ players: players ?? [], tournaments: tournaments ?? [], communities: communities ?? [] })
    setLoading(false)
  }, [])

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery(q)
    doSearch(q, gameFilter, platformFilter, categoryFilter)
  }, [searchParams, gameFilter, platformFilter, categoryFilter])

  function handleInput(e) {
    const v = e.target.value
    setQuery(v)
    setSearchParams(v ? { q: v } : {})
  }

  // Filtered game names for the game picker
  const filteredGameNames = GAME_NAMES.filter(n => {
    if (gameSearch && !n.toLowerCase().includes(gameSearch.toLowerCase())) return false
    if (platformFilter && !GAMES.some(g => g.name === n && g.platform === platformFilter)) return false
    return true
  }).slice(0, 50)

  const counts = {
    players: results.players.length,
    tournaments: results.tournaments.length,
    communities: results.communities.length,
  }

  const hasQuery = query.trim() || gameFilter || platformFilter || categoryFilter

  return (
    <PageWrapper className="max-w-3xl">
      <h1 className="text-3xl font-black text-white mb-6">Search</h1>

      {/* Main search input */}
      <div className="relative mb-4">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input value={query} onChange={handleInput} placeholder="Search players, tournaments, communities..."
          autoFocus
          className="w-full bg-surface border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-muted focus:outline-none focus:border-primary transition-colors" />
      </div>

      {/* Game Filters */}
      <div className="bg-surface border border-white/[0.08] rounded-xl p-4 mb-6">
        <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Filter by Game</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Platform filter */}
          <select value={platformFilter} onChange={e => { setPlatformFilter(e.target.value); setGameFilter('') }}
            className="bg-surface2 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary">
            <option value="">All Platforms</option>
            {GAME_PLATFORMS.map(p => (
              <option key={p} value={p}>{PLATFORM_LABELS[p] ?? p}</option>
            ))}
          </select>

          {/* Category filter */}
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="bg-surface2 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary">
            <option value="">All Categories</option>
            {GAME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {(gameFilter || platformFilter || categoryFilter) && (
            <button onClick={() => { setGameFilter(''); setPlatformFilter(''); setCategoryFilter(''); setGameSearch('') }}
              className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">
              Clear filters
            </button>
          )}
        </div>

        {/* Game name search */}
        <div className="relative mb-2">
          <input value={gameSearch} onChange={e => setGameSearch(e.target.value)}
            placeholder="Search specific game (e.g. PUBG, FIFA, Chess)..."
            className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
        </div>

        {/* Game chips */}
        {(gameSearch || platformFilter) && (
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {gameFilter && (
              <button onClick={() => setGameFilter('')}
                className="text-xs px-2.5 py-1 rounded-full bg-primary text-white font-semibold">
                {gameFilter} ×
              </button>
            )}
            {filteredGameNames.filter(n => n !== gameFilter).map(name => (
              <button key={name} onClick={() => { setGameFilter(name); setGameSearch('') }}
                className="text-xs px-2.5 py-1 rounded-full bg-surface border border-white/10 text-muted hover:text-white hover:border-primary/40 transition-colors">
                {name}
              </button>
            ))}
          </div>
        )}

        {gameFilter && (
          <p className="text-xs text-primary mt-2">Filtering by: <span className="font-semibold">{gameFilter}</span></p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.08] mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === key ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
            <Icon size={14} />{label}
            {counts[key] > 0 && <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{counts[key]}</span>}
          </button>
        ))}
      </div>

      {loading && <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

      {!loading && hasQuery && (
        <>
          {tab === 'players' && (
            results.players.length === 0
              ? <div className="text-center py-16 text-muted">No players found</div>
              : <Card>
                  <div className="divide-y divide-white/[0.06]">
                    {results.players.map(p => (
                      <Link key={p.id} to={`/profile/${p.username}`} className="flex items-center gap-3 p-4 hover:bg-surface2 transition-colors">
                        <UserAvatar user={p} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-white">{p.display_name || p.username}</p>
                            {p.is_verified && <VerifiedBadge size={13} />}
                          </div>
                          <p className="text-xs text-muted">@{p.username} · {getCountryFlag(p.country)} {p.country ?? ''}</p>
                          {p.favourite_game && <p className="text-xs text-muted mt-0.5">{p.favourite_game}</p>}
                        </div>
                        <span className="text-xs text-muted capitalize bg-surface2 px-2 py-0.5 rounded-full">{p.role}</span>
                      </Link>
                    ))}
                  </div>
                </Card>
          )}

          {tab === 'tournaments' && (
            results.tournaments.length === 0
              ? <div className="text-center py-16 text-muted">No tournaments found</div>
              : <Card>
                  <div className="divide-y divide-white/[0.06]">
                    {results.tournaments.map(t => (
                      <Link key={t.id} to={`/tournament/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-surface2 transition-colors">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface2 flex-shrink-0">
                          {t.thumbnail_url
                            ? <img src={t.thumbnail_url} alt={t.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xl bg-primary/10 text-primary font-bold text-sm">{t.game_name?.slice(0,2)}</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                          <p className="text-xs text-muted">{t.game_name} · {t.game_type}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-accent font-semibold">{t.prize_pool_tc > 0 ? `${t.prize_pool_tc} TC` : t.is_practice ? 'Practice' : 'Free'}</p>
                          <p className="text-xs text-muted capitalize">{t.status}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
          )}

          {tab === 'communities' && (
            results.communities.length === 0
              ? <div className="text-center py-16 text-muted">No communities found</div>
              : <Card>
                  <div className="divide-y divide-white/[0.06]">
                    {results.communities.map(c => (
                      <Link key={c.id} to={`/community/${c.slug}`} className="flex items-center gap-3 p-4 hover:bg-surface2 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                          {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-sm font-bold text-primary">{c.name?.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{c.name}</p>
                          <p className="text-xs text-muted truncate">{c.description ?? c.game_focus ?? ''}</p>
                        </div>
                        <span className="text-xs text-muted">{c.member_count} members</span>
                      </Link>
                    ))}
                  </div>
                </Card>
          )}
        </>
      )}

      {!loading && !hasQuery && (
        <div className="text-center py-20 text-muted">
          <SearchIcon size={40} className="mx-auto mb-4 opacity-30" />
          <p>Search players, tournaments, or communities</p>
          <p className="text-xs mt-2">Or use the game filter above to browse by game</p>
        </div>
      )}
    </PageWrapper>
  )
}
