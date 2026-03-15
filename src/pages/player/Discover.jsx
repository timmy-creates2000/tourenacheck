import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import TournamentCard from '../../components/tournament/TournamentCard'
import { SkeletonCard } from '../../components/ui/Skeleton'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { GAME_TYPES } from '../../lib/constants'
import { GAME_NAMES, GAME_PLATFORMS } from '../../lib/games'
import { formatTC, getCountryFlag } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function Discover() {
  const [tournaments, setTournaments] = useState([])
  const [winners, setWinners] = useState([])
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ gameType: '', game: '', mode: '', entry: '', status: '' })
  const [gameSearch, setGameSearch] = useState('')
  const [showGamePicker, setShowGamePicker] = useState(false)
  const [joinModal, setJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    fetchTournaments()
    fetchRecentWinners()
    fetchSponsors()
  }, [filters])

  async function fetchTournaments() {
    setLoading(true)
    let q = supabase.from('tournaments').select('*').in('status', ['published', 'ongoing', 'approved']).eq('is_public', true).order('created_at', { ascending: false })
    if (filters.gameType) q = q.eq('game_type', filters.gameType)
    if (filters.game) q = q.ilike('game_name', `%${filters.game}%`)
    if (filters.mode) q = q.eq('mode', filters.mode)
    if (filters.entry === 'free') q = q.eq('entry_fee_tc', 0).eq('is_practice', false)
    if (filters.entry === 'practice') q = q.eq('is_practice', true)
    if (filters.entry === 'paid') q = q.gt('entry_fee_tc', 0)
    if (filters.status === 'open') q = q.eq('status', 'published')
    if (filters.status === 'upcoming') q = q.eq('status', 'approved')
    const { data } = await q.limit(24)
    setTournaments(data ?? [])
    setLoading(false)
  }

  async function fetchRecentWinners() {
    const { data } = await supabase
      .from('participants')
      .select('user_id, tournament_id, placement, users(id, username, avatar_url, country), tournaments(game_name, prize_pool_tc)')
      .eq('status', 'winner')
      .order('registered_at', { ascending: false })
      .limit(6)
    setWinners(data ?? [])
  }

  async function fetchSponsors() {
    const now = new Date().toISOString()
    const { data } = await supabase.from('sponsors')
      .select('*')
      .eq('is_active', true)
      .in('placement', ['discover', 'banner'])
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order('priority', { ascending: false })
      .limit(5)
    setSponsors(data ?? [])
  }

  async function handleJoinWithCode() {
    if (!joinCode.trim()) return
    const { data } = await supabase.from('tournaments').select('id').eq('join_code', joinCode.trim()).single()
    if (!data) { toast.error('Invalid join code'); return }
    setJoinModal(false)
    window.location.href = `/tournament/${data.id}`
  }

  const filtered = tournaments.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.game_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageWrapper>
      {/* Hero */}
      <div className="text-center py-10 mb-8">
        <h1 className="text-4xl md:text-5xl font-black mb-3">
          <span className="gradient-text">Find Your Next Tournament</span>
        </h1>
        <p className="text-muted text-lg mb-6">Compete, win, and earn Tourena Coins</p>
        <div className="max-w-xl mx-auto relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tournaments or games..."
            className="w-full bg-surface border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-muted focus:outline-none focus:border-primary transition-colors" />
        </div>
      </div>

      {/* Sponsor Banners */}
      {sponsors.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {sponsors.map(s => (
            <a key={s.id} href={s.link_url ?? '#'} target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 relative rounded-xl overflow-hidden border border-white/10 hover:border-primary/40 transition-colors group"
              style={{ width: 280, height: 80 }}>
              {s.image_url
                ? <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="w-full h-full bg-surface2 flex items-center justify-center text-sm font-bold text-white">{s.name}</div>
              }
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent flex items-center px-4">
                <span className="text-white font-bold text-sm drop-shadow">{s.name}</span>
              </div>
              <span className="absolute top-1.5 right-2 text-[10px] text-white/50">Sponsored</span>
            </a>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-start">
        {/* Game type */}
        <select value={filters.gameType} onChange={e => setFilters(p => ({ ...p, gameType: e.target.value }))}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="">All Platforms</option>
          {GAME_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>

        {/* Entry type */}
        <select value={filters.entry} onChange={e => setFilters(p => ({ ...p, entry: e.target.value }))}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="">All Entry Types</option>
          <option value="free">Free</option>
          <option value="practice">Practice</option>
          <option value="paid">Paid</option>
        </select>

        {/* Status */}
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="upcoming">Upcoming</option>
        </select>

        {/* Game picker */}
        <div className="relative">
          <button onClick={() => setShowGamePicker(v => !v)}
            className={`bg-surface border rounded-lg px-3 py-2 text-sm transition-colors ${filters.game ? 'border-primary text-white' : 'border-white/10 text-muted hover:text-white'}`}>
            {filters.game || 'Filter by Game'}
          </button>
          {showGamePicker && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-surface border border-white/10 rounded-xl shadow-2xl z-20 p-3">
              <input value={gameSearch} onChange={e => setGameSearch(e.target.value)}
                placeholder="Search game..."
                className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary mb-2" />
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                <button onClick={() => { setFilters(p => ({ ...p, game: '' })); setShowGamePicker(false) }}
                  className="w-full text-left px-3 py-1.5 text-sm text-muted hover:text-white hover:bg-surface2 rounded-lg transition-colors">
                  All Games
                </button>
                {GAME_NAMES
                  .filter(n => !gameSearch || n.toLowerCase().includes(gameSearch.toLowerCase()))
                  .slice(0, 60)
                  .map(name => (
                    <button key={name} onClick={() => { setFilters(p => ({ ...p, game: name })); setShowGamePicker(false); setGameSearch('') }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${filters.game === name ? 'bg-primary/20 text-white' : 'text-muted hover:text-white hover:bg-surface2'}`}>
                      {name}
                    </button>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {(filters.game || filters.gameType || filters.entry || filters.status) && (
          <button onClick={() => { setFilters({ gameType: '', game: '', mode: '', entry: '', status: '' }); setGameSearch('') }}
            className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-2 rounded-lg transition-colors">
            Clear filters
          </button>
        )}

        <Button variant="secondary" size="sm" onClick={() => setJoinModal(true)}>Join with Code</Button>
      </div>

      {/* Tournament Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎮</div>
          <h3 className="text-xl font-bold text-white mb-2">No tournaments found</h3>
          <p className="text-muted">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(t => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      )}

      {/* Recent Winners */}
      {winners.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Winners</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {winners.map((w, i) => (
              <div key={i} className="bg-surface border border-white/[0.08] rounded-xl p-4 text-center hover:border-accent/30 transition-colors">
                <Avatar user={w.users} size={48} linkable />
                <p className="text-sm font-semibold text-white mt-2 truncate">{w.users?.username}</p>
                <p className="text-xs text-muted">{getCountryFlag(w.users?.country)}</p>
                <p className="text-xs text-accent font-semibold mt-1">{formatTC(w.tournaments?.prize_pool_tc ?? 0)}</p>
                <p className="text-xs text-muted truncate">{w.tournaments?.game_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join with Code Modal */}
      <Modal open={joinModal} onClose={() => setJoinModal(false)} title="Join with Code">
        <div className="space-y-4">
          <Input label="Tournament Join Code" placeholder="Enter code..." value={joinCode} onChange={e => setJoinCode(e.target.value)} />
          <Button onClick={handleJoinWithCode} className="w-full">Join Tournament</Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
