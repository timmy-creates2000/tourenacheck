import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import GiftCoinModal from '../../components/ui/GiftCoinModal'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatTC, formatDate, getCountryFlag, winRate, truncate, getPlayerStars, getStreakTier, timeAgo } from '../../lib/utils'
import { BADGES } from '../../lib/constants'
import { VerifiedBadge } from '../../components/ui/Avatar'
import { MessageCircle, Gift, UserPlus, UserCheck, Trophy, Gamepad2, Star, Zap, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'

function OrganizerTab({ userId }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.from('tournaments')
      .select('id, title, game_name, thumbnail_url, status, current_participants, max_participants, prize_pool_tc, created_at')
      .eq('organizer_id', userId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { setTournaments(data ?? []); setLoading(false) })
  }, [userId])
  if (loading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
  if (tournaments.length === 0) return <div className="text-center py-12 text-muted">No hosted tournaments yet</div>
  const STATUS_COLOR = { draft: 'gray', pending_approval: 'amber', approved: 'blue', ongoing: 'green', completed: 'purple', cancelled: 'red' }
  return (
    <Card>
      <div className="divide-y divide-white/[0.06]">
        {tournaments.map(t => (
          <Link key={t.id} to={`/tournament/${t.id}`} className="flex items-center gap-4 p-4 hover:bg-surface2 transition-colors">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface2 flex-shrink-0">
              {t.thumbnail_url ? <img src={t.thumbnail_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{t.title}</p>
              <p className="text-xs text-muted">{t.game_name} · {t.current_participants}/{t.max_participants}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <Badge color={STATUS_COLOR[t.status] ?? 'gray'}>{t.status?.replace(/_/g, ' ')}</Badge>
              <span className="text-xs text-accent flex items-center gap-1"><img src="/coin.svg" alt="TC" className="w-3 h-3" />{formatTC(t.prize_pool_tc ?? 0)}</span>
            </div>
          </Link>
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
  const [shareOpen, setShareOpen] = useState(false)

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
    setStats(s); setBadges(b ?? []); setGameTags(gt ?? [])
    setRecentTournaments(rt ?? [])
    setFollowerCount(followers ?? 0); setFollowingCount(following ?? 0)
    setIsFollowing(!!myFollow)
    setLoading(false)
  }

  async function startConversation() {
    if (!me || !user) return
    // Check if conversation exists
    const { data: existing } = await supabase.from('conversations')
      .select('id')
      .or(`and(participant_a.eq.${me.id},participant_b.eq.${user.id}),and(participant_a.eq.${user.id},participant_b.eq.${me.id})`)
      .single()
    
    if (existing) {
      window.location.href = `/messages?conversation=${existing.id}`
      return
    }
    
    // Create new conversation
    const { data: newConvo } = await supabase.from('conversations')
      .insert({ participant_a: me.id, participant_b: user.id })
      .select()
      .single()
    
    if (newConvo) {
      window.location.href = `/messages?conversation=${newConvo.id}`
    }
  }

  async function toggleFollow() {
    if (!me || !user) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', user.id)
      setIsFollowing(false); setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('follows').insert({ follower_id: me.id, following_id: user.id })
      setIsFollowing(true); setFollowerCount(c => c + 1)
    }
    setFollowLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-bg">
      <Skeleton className="h-48 w-full" />
      <div className="max-w-4xl mx-auto px-4 -mt-16 pb-8">
        <Skeleton className="w-32 h-32 rounded-full mb-4" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  )
  if (!user) return (
    <PageWrapper>
      <div className="text-center py-20">
        <div className="text-6xl mb-4">👤</div>
        <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
        <p className="text-muted mb-6">The user @{username} doesn't exist or has been deleted.</p>
        <Link to="/discover">
          <Button>Browse Players</Button>
        </Link>
      </div>
    </PageWrapper>
  )

  const wr = winRate(stats?.tournaments_won ?? 0, stats?.tournaments_played ?? 0)
  const earnedBadgeTypes = new Set(badges.map(b => b.badge_type))
  const stars = getPlayerStars(stats?.tournaments_won ?? 0, stats?.tournaments_played ?? 0)
  const streakTier = getStreakTier(stats?.current_win_streak ?? 0)
  const chartData = recentTournaments.slice(0, 10).map(p => ({ name: truncate(p.tournaments?.title ?? '', 10), placement: p.placement ?? 0 })).reverse()
  const isMe = me?.id === user.id
  const TABS = ['overview', 'activity', 'badges', 'tournaments', ...(user.role === 'organizer' ? ['organizer'] : []), 'about']

  return (
    <div className="min-h-screen bg-bg pb-24 md:pb-8">
      {giftOpen && <GiftCoinModal receiverUser={user} onClose={() => setGiftOpen(false)} />}
      
      {/* Share Modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShareOpen(false)}>
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Share Profile</h3>
            <div className="space-y-3">
              <div className="bg-surface2 rounded-lg p-3">
                <p className="text-xs text-muted mb-2">Profile Link</p>
                <p className="text-sm text-white break-all">{window.location.href}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    toast.success('Link copied!')
                  }}
                  className="flex-1"
                >
                  Copy Link
                </Button>
                <Button variant="secondary" onClick={() => setShareOpen(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover photo */}
      <div className="relative h-40 sm:h-56 bg-gradient-to-br from-primary/40 via-surface to-accent/20 overflow-hidden">
        {user.banner_url && <img src={user.banner_url} className="w-full h-full object-cover" alt="" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-4 relative z-10">
          <div className="relative">
            {user.avatar_url
              ? <img src={user.avatar_url} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-bg shadow-xl" alt={user.username} />
              : <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary/30 border-4 border-bg flex items-center justify-center text-3xl font-black text-white shadow-xl">{user.username?.slice(0,2).toUpperCase()}</div>
            }
            {/* Online indicator */}
            {user.is_online && <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-bg" />}
          </div>

          {/* Action buttons */}
          {!isMe && me && (
            <div className="flex gap-2 pb-2 flex-wrap">
              <Button size="sm" variant={isFollowing ? 'secondary' : 'primary'} loading={followLoading} onClick={toggleFollow}>
                {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                <span className="ml-1.5 hidden sm:inline">{isFollowing ? 'Following' : 'Follow'}</span>
              </Button>
              <Button size="sm" variant="secondary" onClick={startConversation}>
                <MessageCircle size={15} />
                <span className="ml-1.5 hidden sm:inline">Message</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setGiftOpen(true)}>
                <Gift size={15} />
                <span className="ml-1.5 hidden sm:inline">Gift</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShareOpen(true)}>
                <Share2 size={15} />
                <span className="ml-1.5 hidden sm:inline">Share</span>
              </Button>
            </div>
          )}
          {isMe && (
            <div className="flex gap-2 pb-2">
              <Link to="/settings">
                <Button size="sm" variant="secondary">
                  Edit Profile
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Name + meta */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white">{user.display_name || user.username}</h1>
            {user.is_verified && <VerifiedBadge size={18} />}
            {user.is_verified_organizer && <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full font-semibold">Verified Org</span>}
            <span className="text-lg">{getCountryFlag(user.country)}</span>
          </div>
          <p className="text-muted text-sm mb-2">@{user.username} · <span className="capitalize">{user.role}</span></p>

          {/* Stars */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className={i < stars ? 'text-amber-400 fill-amber-400' : 'text-white/15'} />
              ))}
            </div>
            {streakTier && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${streakTier.bg} ${streakTier.color}`}>
                <Zap size={10} />{stats?.current_win_streak}W · {streakTier.label}
              </span>
            )}
          </div>

          {user.bio && <p className="text-white/80 text-sm mb-3 max-w-xl">{user.bio}</p>}

          {/* Follower counts */}
          <div className="flex items-center gap-5 text-sm mb-3">
            <span><span className="text-white font-bold">{followerCount}</span> <span className="text-muted">followers</span></span>
            <span><span className="text-white font-bold">{followingCount}</span> <span className="text-muted">following</span></span>
            <span><span className="text-white font-bold">{stats?.tournaments_played ?? 0}</span> <span className="text-muted">tournaments</span></span>
          </div>

          {/* Social + game tags row */}
          <div className="flex flex-wrap gap-2 text-xs">
            {user.favourite_game && <span className="flex items-center gap-1 bg-surface2 px-2 py-1 rounded-lg text-muted"><Gamepad2 size={11} />{user.favourite_game}</span>}
            {user.social_youtube && <a href={user.social_youtube} target="_blank" rel="noreferrer" className="bg-red-500/10 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/20 transition-colors">YouTube</a>}
            {user.social_twitter && <a href={user.social_twitter} target="_blank" rel="noreferrer" className="bg-sky-500/10 text-sky-400 px-2 py-1 rounded-lg hover:bg-sky-500/20 transition-colors">Twitter</a>}
            {user.social_twitch && <a href={user.social_twitch} target="_blank" rel="noreferrer" className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg hover:bg-purple-500/20 transition-colors">Twitch</a>}
            {gameTags.map(gt => (
              <span key={gt.id} className="bg-primary/10 text-primary px-2 py-1 rounded-lg">{gt.game_name} <span className="text-white/60">#{gt.game_tag}</span></span>
            ))}
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { icon: <Trophy size={16} className="text-accent" />, value: stats?.tournaments_won ?? 0, label: 'Wins' },
            { icon: <span className="text-base">📊</span>, value: `${wr}%`, label: 'Win Rate' },
            { icon: <img src="/coin.svg" alt="TC" className="w-4 h-4" />, value: formatTC(stats?.total_tc_earned ?? 0), label: 'Earned' },
            { icon: <Zap size={16} className="text-amber-400" />, value: stats?.current_win_streak ?? 0, label: 'Streak' },
          ].map((s, i) => (
            <Card key={i} className="p-3 text-center">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <div className="text-base font-black text-white leading-tight">{s.value}</div>
              <div className="text-[10px] text-muted">{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/[0.08]">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Played', value: stats?.tournaments_played ?? 0 },
                { label: 'Won', value: stats?.tournaments_won ?? 0 },
                { label: 'Best Prize', value: formatTC(stats?.best_prize_tc ?? 0) },
                { label: 'TC Spent', value: formatTC(stats?.total_tc_spent ?? 0) },
                { label: 'Opponents', value: stats?.total_opponents_faced ?? 0 },
                { label: 'Longest Streak', value: stats?.longest_win_streak ?? 0 },
              ].map((s, i) => (
                <Card key={i} className="p-4">
                  <div className="text-xl font-black text-white">{s.value}</div>
                  <div className="text-xs text-muted">{s.label}</div>
                </Card>
              ))}
            </div>
            {chartData.length > 1 && (
              <Card className="p-4">
                <h3 className="text-sm font-bold text-white mb-4">Performance (Last 10)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                    <YAxis reversed tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="placement" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        )}

        {tab === 'badges' && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {BADGES.map(b => {
              const earned = earnedBadgeTypes.has(b.type)
              return (
                <div key={b.type} className={`p-3 rounded-xl border text-center transition-all ${earned ? (b.rare ? 'border-amber-500/50 bg-amber-500/10' : 'border-primary/30 bg-primary/10') : 'border-white/[0.06] bg-surface opacity-40'}`}>
                  <div className="text-2xl mb-1">{b.icon}</div>
                  <p className="text-xs font-bold text-white leading-tight">{b.name}</p>
                  {b.rare && earned && <Badge color="gold" className="mt-1">Rare</Badge>}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'tournaments' && (
          <Card>
            <div className="divide-y divide-white/[0.06]">
              {recentTournaments.length === 0
                ? <div className="text-center py-12 text-muted">No tournaments yet</div>
                : recentTournaments.map(p => (
                  <Link key={p.id} to={`/tournament/${p.tournaments?.id}`} className="flex items-center gap-4 p-4 hover:bg-surface2 transition-colors">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface2 flex-shrink-0">
                      {p.tournaments?.thumbnail_url ? <img src={p.tournaments.thumbnail_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center">🎮</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.tournaments?.title}</p>
                      <p className="text-xs text-muted">{p.tournaments?.game_name}</p>
                    </div>
                    {p.placement && <Badge color={p.placement === 1 ? 'gold' : p.placement <= 3 ? 'amber' : 'gray'}>#{p.placement}</Badge>}
                  </Link>
                ))
              }
            </div>
          </Card>
        )}

        {tab === 'organizer' && <OrganizerTab userId={user.id} />}

        {tab === 'activity' && (
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentTournaments.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Trophy size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white">
                        {p.placement === 1 ? '🏆 Won' : p.placement <= 3 ? '🥉 Placed' : '🎮 Played'}{' '}
                        <Link to={`/tournament/${p.tournaments?.id}`} className="text-primary hover:underline">
                          {p.tournaments?.title}
                        </Link>
                      </p>
                      <p className="text-xs text-muted">{timeAgo(p.registered_at)}</p>
                    </div>
                    {p.placement && (
                      <Badge color={p.placement === 1 ? 'gold' : p.placement <= 3 ? 'amber' : 'gray'}>
                        #{p.placement}
                      </Badge>
                    )}
                  </div>
                ))}
                {recentTournaments.length === 0 && (
                  <p className="text-center py-8 text-muted text-sm">No recent activity</p>
                )}
              </div>
            </Card>

            {/* Friends/Following */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-4">Following ({followingCount})</h3>
              <p className="text-xs text-muted">Feature coming soon - view who {user.username} follows</p>
            </Card>
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-4">About</h3>
              <div className="space-y-3 text-sm">
                {user.bio && (
                  <div>
                    <p className="text-muted mb-1">Bio</p>
                    <p className="text-white">{user.bio}</p>
                  </div>
                )}
                {user.country && (
                  <div>
                    <p className="text-muted mb-1">Location</p>
                    <p className="text-white">{getCountryFlag(user.country)} {user.country}</p>
                  </div>
                )}
                {user.favourite_game && (
                  <div>
                    <p className="text-muted mb-1">Favorite Game</p>
                    <p className="text-white">{user.favourite_game}</p>
                  </div>
                )}
                {gameTags.length > 0 && (
                  <div>
                    <p className="text-muted mb-1">Game Tags</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {gameTags.map(gt => (
                        <span key={gt.id} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs">
                          {gt.game_name} <span className="text-white/60">#{gt.game_tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-muted mb-1">Member Since</p>
                  <p className="text-white">{formatDate(user.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted mb-1">Role</p>
                  <p className="text-white capitalize">{user.role}</p>
                </div>
                {(user.is_host || user.is_verified_organizer) && (
                  <div>
                    <p className="text-muted mb-1">Status</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {user.is_host && <Badge color="primary">Tournament Host</Badge>}
                      {user.is_verified_organizer && <Badge color="accent">Verified Organizer</Badge>}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Social Links */}
            {(user.social_youtube || user.social_twitter || user.social_twitch) && (
              <Card className="p-5">
                <h3 className="text-sm font-bold text-white mb-4">Social Links</h3>
                <div className="space-y-2">
                  {user.social_youtube && (
                    <a href={user.social_youtube} target="_blank" rel="noreferrer" 
                      className="flex items-center gap-3 p-3 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                        YT
                      </div>
                      <span className="text-sm text-white">YouTube</span>
                    </a>
                  )}
                  {user.social_twitter && (
                    <a href={user.social_twitter} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-3 bg-sky-500/10 hover:bg-sky-500/20 rounded-lg transition-colors">
                      <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                        𝕏
                      </div>
                      <span className="text-sm text-white">Twitter / X</span>
                    </a>
                  )}
                  {user.social_twitch && (
                    <a href={user.social_twitch} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-3 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                        TW
                      </div>
                      <span className="text-sm text-white">Twitch</span>
                    </a>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
