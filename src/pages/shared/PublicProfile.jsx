import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import GiftCoinModal from '../../components/ui/GiftCoinModal'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatTC, formatDate, getCountryFlag, winRate, truncate, getPlayerStars, getStreakTier } from '../../lib/utils'
import { BADGES } from '../../lib/constants'
import { VerifiedBadge } from '../../components/ui/Avatar'

function OrganizerTab({ userId }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('tournaments')
      .select('id, title, game_name, thumbnail_url, status, current_participants, max_participants, prize_pool_tc, created_at')
      .eq('organizer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setTournaments(data ?? []); setLoading(false) })
  }, [userId])

  if (loading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
  if (tournaments.length === 0) return <div className="text-center py-12 text-muted">No hosted tournaments yet</div>

  const STATUS_COLOR = { draft: 'gray', pending_approval: 'amber', approved: 'blue', ongoing: 'green', completed: 'purple', cancelled: 'red' }

  return (
    <Card>
      <div className="divide-y divide-white/[0.06]">
        {tournaments.map(t => (
          <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-surface2 transition-colors">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface2 flex-shrink-0">
              {t.thumbnail_url ? <img src={t.thumbnail_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{t.title}</p>
              <p className="text-xs text-muted">{t.game_name} · {t.current_participants}/{t.max_participants} players</p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <Badge color={STATUS_COLOR[t.status] ?? 'gray'}>{t.status?.replace(/_/g, ' ')}</Badge>
              <span className="text-xs text-accent flex items-center gap-1"><img src="/coin.svg" alt="TC" className="w-3 h-3" /> {formatTC(t.prize_pool_tc ?? 0)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function PublicProfile() {
  const { username } = useParams()
  const { user: me } = useAuth()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [badges, setBadges] = useState([])
  const [gameTags, setGameTags] = useState([])
  const [recentTournaments, setRecentTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [giftOpen, setGiftOpen] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => { fetchProfile() }, [username])

  async function fetchProfile() {
    const { data: u } = await supabase.from('users').select('*').eq('username', username).single()
    if (!u) { setLoading(false); return }
    setUser(u)
    const [{ data: s }, { data: b }, { data: gt }, { data: rt }, { count: followers }, { count: following }, { data: myFollow }] = await Promise.all([
      supabase.from('player_stats').select('*').eq('user_id', u.id).single(),
      supabase.from('player_badges').select('*').eq('user_id', u.id),
      supabase.from('game_tags').select('*').eq('user_id', u.id),
      supabase.from('participants').select('*, tournaments(id, title, game_name, thumbnail_url, is_practice, prize_pool_tc)').eq('user_id', u.id).order('registered_at', { ascending: false }).limit(10),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', u.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', u.id),
      me ? supabase.from('follows').select('id').eq('follower_id', me.id).eq('following_id', u.id).single() : Promise.resolve({ data: null }),
    ])
    setStats(s)
    setBadges(b ?? [])
    setGameTags(gt ?? [])
    setRecentTournaments(rt ?? [])
    setFollowerCount(followers ?? 0)
    setFollowingCount(following ?? 0)
    setIsFollowing(!!myFollow)
    setLoading(false)
  }

  async function toggleFollow() {
    if (!me || !user) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', user.id)
      setIsFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('follows').insert({ follower_id: me.id, following_id: user.id })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
    setFollowLoading(false)
  }

  if (loading) return <PageWrapper><div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}</div></PageWrapper>
  if (!user) return <PageWrapper><div className="text-center py-20 text-muted">User not found</div></PageWrapper>

  const wr = winRate(stats?.tournaments_won ?? 0, stats?.tournaments_played ?? 0)
  const earnedBadgeTypes = new Set(badges.map(b => b.badge_type))
  const stars = getPlayerStars(stats?.tournaments_won ?? 0, stats?.tournaments_played ?? 0)
  const streakTier = getStreakTier(stats?.current_win_streak ?? 0)

  const chartData = recentTournaments.slice(0, 10).map((p, i) => ({
    name: truncate(p.tournaments?.title ?? '', 12),
    placement: p.placement ?? 0,
  })).reverse()

  return (
    <PageWrapper>
      {giftOpen && <GiftCoinModal receiverUser={user} onClose={() => setGiftOpen(false)} />}
      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {user.avatar_url
            ? <img src={user.avatar_url} className="w-20 h-20 rounded-full object-cover border-2 border-primary/50" alt={user.username} />
            : <div className="w-20 h-20 rounded-full bg-primary/30 border-2 border-primary/50 flex items-center justify-center text-2xl font-black text-white">{user.username?.slice(0,2).toUpperCase()}</div>
          }
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white">{user.username}</h1>
              {user.is_verified && <VerifiedBadge size={18} />}
              <span className="text-lg">{getCountryFlag(user.country)}</span>
              <Badge color={user.role === 'organizer' ? 'amber' : 'purple'}>{user.role}</Badge>
            </div>
            {/* Stars */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`text-base ${i < stars ? 'text-amber-400' : 'text-white/15'}`}>★</span>
                ))}
                <span className="text-xs text-muted ml-1">{stars}/5</span>
              </div>
              {streakTier && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${streakTier.bg} ${streakTier.color}`}>
                  <span>{streakTier.icon}</span>
                  <span>{stats?.current_win_streak}W Streak · {streakTier.label}</span>
                </div>
              )}
            </div>
            {/* Follower counts */}
            <div className="flex items-center gap-4 text-xs text-muted mb-2">
              <span><span className="text-white font-bold">{followerCount}</span> followers</span>
              <span><span className="text-white font-bold">{followingCount}</span> following</span>
            </div>
            {user.display_name && <p className="text-muted text-sm mb-1">{user.display_name}</p>}
            {/* Gender + Favourite Game */}
            <div className="flex flex-wrap gap-3 text-xs text-muted mb-2">
              {user.gender && user.gender !== 'prefer_not_to_say' && (
                <span className="capitalize">{user.gender.replace('_', ' ')}</span>
              )}
              {user.favourite_game && (
                <span>🎮 {user.favourite_game}</span>
              )}
            </div>
            {user.bio && <p className="text-white/80 text-sm mb-3 max-w-lg">{user.bio}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>Member since {formatDate(user.created_at)}</span>
                {user.social_youtube && <a href={user.social_youtube} target="_blank" rel="noreferrer" className="text-red-400 hover:text-red-300 underline">YouTube</a>}
                {user.social_twitter && <a href={user.social_twitter} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 underline">Twitter</a>}
                {user.social_twitch && <a href={user.social_twitch} target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 underline">Twitch</a>}
              </div>
              {/* Follow + Gift buttons — only show when viewing someone else */}
              {me && me.id !== user.id && (
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" variant={isFollowing ? 'secondary' : 'primary'} loading={followLoading} onClick={toggleFollow}>
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setGiftOpen(true)}>
                    Gift Coins
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.08]">
        {['overview', 'badges', 'tournaments', ...(user.role === 'organizer' ? ['organizer'] : [])].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🎮', label: 'Tournaments Played', value: stats?.tournaments_played ?? 0 },
              { icon: '🏆', label: 'Tournaments Won', value: stats?.tournaments_won ?? 0 },
              { icon: '📊', label: 'Win Rate', value: `${wr}%` },
              { icon: <img src="/coin.svg" alt="TC" className="w-5 h-5" />, label: 'Total TC Earned', value: formatTC(stats?.total_tc_earned ?? 0) },
              { icon: <img src="/coin.svg" alt="TC" className="w-5 h-5" />, label: 'TC Spent on Fees', value: formatTC(stats?.total_tc_spent ?? 0) },
              { icon: '👥', label: 'Opponents Faced', value: stats?.total_opponents_faced ?? 0 },
              { icon: <img src="/coin.svg" alt="TC" className="w-5 h-5" />, label: 'Best Prize', value: formatTC(stats?.best_prize_tc ?? 0) },
              { icon: '🕹️', label: 'Favourite Game', value: stats?.favourite_game ?? '—' },
              { icon: '🎪', label: 'Favourite Mode', value: stats?.favourite_mode ?? '—' },
            ].map((s, i) => (
              <Card key={i} className="p-4">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-lg font-black text-white">{s.value}</div>
                <div className="text-xs text-muted">{s.label}</div>
              </Card>
            ))}
            {/* Streak cards — highlighted */}
            <Card className={`p-4 border ${streakTier ? streakTier.bg : 'border-white/[0.06]'}`}>
              <div className="text-xl mb-1">🔥</div>
              <div className={`text-lg font-black ${streakTier ? streakTier.color : 'text-white'}`}>{stats?.current_win_streak ?? 0}</div>
              <div className="text-xs text-muted">Win Streak</div>
              {streakTier && <div className={`text-xs font-semibold mt-1 ${streakTier.color}`}>{streakTier.label}</div>}
            </Card>
            <Card className="p-4">
              <div className="text-xl mb-1">⚡</div>
              <div className="text-lg font-black text-white">{stats?.longest_win_streak ?? 0}</div>
              <div className="text-xs text-muted">Longest Streak</div>
            </Card>
          </div>

          {/* Game Tags */}
          {gameTags.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-bold text-white mb-3">Game Tags</h3>
              <div className="flex flex-wrap gap-2">
                {gameTags.map(gt => (
                  <div key={gt.id} className="bg-surface2 border border-white/10 rounded-lg px-3 py-1.5 text-sm">
                    <span className="text-white font-semibold">{gt.game_name}</span>
                    <span className="text-muted ml-2">#{gt.game_tag}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Performance Chart */}
          {chartData.length > 1 && (
            <Card className="p-4">
              <h3 className="text-sm font-bold text-white mb-4">Performance (Last 10 Tournaments)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis reversed tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#F59E0B' }} />
                  <Line type="monotone" dataKey="placement" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#F59E0B', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {tab === 'badges' && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {BADGES.map(b => {
            const earned = earnedBadgeTypes.has(b.type)
            return (
              <div key={b.type} className={`p-4 rounded-xl border text-center transition-all ${earned ? (b.rare ? 'border-amber-500/50 bg-amber-500/10 badge-pulse' : 'border-primary/30 bg-primary/10') : 'border-white/[0.06] bg-surface opacity-40'}`}>
                <div className="text-3xl mb-2">{b.icon}</div>
                <p className="text-xs font-bold text-white">{b.name}</p>
                <p className="text-xs text-muted mt-0.5">{b.description}</p>
                {b.rare && earned && <Badge color="gold" className="mt-2">Rare</Badge>}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'organizer' && (
        <OrganizerTab userId={user.id} />
      )}

      {tab === 'tournaments' && (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {recentTournaments.length === 0 ? (
              <div className="text-center py-12 text-muted">No tournaments yet</div>
            ) : recentTournaments.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-surface2 transition-colors">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface2 flex-shrink-0">
                  {p.tournaments?.thumbnail_url ? <img src={p.tournaments.thumbnail_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.tournaments?.title}</p>
                  <p className="text-xs text-muted">{p.tournaments?.game_name}</p>
                </div>
                {p.tournaments?.is_practice ? <Badge color="gray" outline>Practice</Badge> : null}
                <div className="text-right">
                  {p.placement && <Badge color={p.placement === 1 ? 'gold' : p.placement <= 3 ? 'amber' : 'gray'}>#{p.placement}</Badge>}
                  {!p.tournaments?.is_practice && p.placement === 1 && <p className="text-xs text-accent mt-1 flex items-center gap-1"><img src="/coin.svg" alt="TC" className="w-3 h-3" /> {formatTC(p.tournaments?.prize_pool_tc ?? 0)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageWrapper>
  )
}
