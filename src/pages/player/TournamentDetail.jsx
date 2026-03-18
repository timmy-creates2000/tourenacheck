import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import CountdownTimer from '../../components/ui/CountdownTimer'
import WinnerSpotlight from '../../components/tournament/WinnerSpotlight'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, formatDateTime, winRate } from '../../lib/utils'
import { STATUS_COLORS } from '../../lib/constants'
import { activateReferral } from '../../lib/referrals'
import toast from 'react-hot-toast'

export default function TournamentDetail() {
  const { id } = useParams()
  const { profile, refreshProfile } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [topPlayers, setTopPlayers] = useState([])
  const [myParticipant, setMyParticipant] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [registerModal, setRegisterModal] = useState(false)
  const [gameTag, setGameTag] = useState('')
  const [teamName, setTeamName] = useState('')
  const [tab, setTab] = useState('bracket')

  useEffect(() => { fetchAll() }, [id])

  useEffect(() => {
    const channel = supabase.channel(`detail:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` }, fetchParticipants)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, (p) => setTournament(prev => ({ ...prev, ...p.new })))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  async function fetchAll() {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('matches').select('*, player1:player1_id(id, username, avatar_url), player2:player2_id(id, username, avatar_url)').eq('tournament_id', id),
    ])
    setTournament(t)
    setMatches(m ?? [])
    await fetchParticipants()
    setLoading(false)
  }

  async function fetchParticipants() {
    const { data } = await supabase.from('participants').select('*, users(id, username, avatar_url, country), player_stats(tournaments_won, tournaments_played)').eq('tournament_id', id)
    setParticipants(data ?? [])
    if (profile) setMyParticipant(data?.find(p => p.user_id === profile.id) ?? null)
    const top = [...(data ?? [])].sort((a, b) => (b.player_stats?.tournaments_won ?? 0) - (a.player_stats?.tournaments_won ?? 0)).slice(0, 3)
    setTopPlayers(top)
  }

  async function handleRegister() {
    if (!profile) return
    const t = tournament

    // Guard: registration deadline passed
    if (t.registration_deadline && new Date(t.registration_deadline) < new Date()) {
      toast.error('Registration deadline has passed')
      return
    }
    // Guard: tournament full
    if (t.current_participants >= t.max_participants) {
      toast.error('This tournament is full')
      return
    }
    // Guard: insufficient balance
    if (t.entry_fee_tc > 0 && (profile.coin_balance ?? 0) < t.entry_fee_tc) {
      toast.error('Insufficient TC balance')
      return
    }

    try {
      await supabase.from('participants').insert({
        tournament_id: id,
        user_id: profile.id,
        game_tag: gameTag,
        team_name: teamName || null,
        status: 'registered',
      })

      if (t.entry_fee_tc > 0) {
        await supabase.rpc('debit_coins', {
          p_user_id: profile.id,
          p_amount: t.entry_fee_tc,
          p_type: 'entry_fee',
          p_description: `Entry fee: ${t.title}`,
          p_tournament_id: id,
        })
        await refreshProfile()
      }

      await supabase.from('tournaments')
        .update({ current_participants: (t.current_participants ?? 0) + 1 })
        .eq('id', id)

      // Activate referral on first tournament join
      const { count } = await supabase.from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
      if (count <= 1) {
        await activateReferral(profile.id)
      }

      setRegisterModal(false)
      fetchAll()
      toast.success('Registered successfully')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return <PageWrapper><Skeleton className="h-64" /></PageWrapper>
  if (!tournament) return <PageWrapper><div className="text-center py-20 text-muted">Tournament not found</div></PageWrapper>

  const t = tournament
  const progress = t.max_participants > 0 ? (t.current_participants / t.max_participants) * 100 : 0
  const isRegistered = !!myParticipant
  const canRegister = !isRegistered && t.status === 'published' && t.current_participants < t.max_participants
  const winnerParticipant = participants.find(p => p.status === 'winner')
  const winnerUser = winnerParticipant?.users

  return (
    <PageWrapper>
      {/* Banner */}
      {t.banner_url && <img src={t.banner_url} className="w-full h-40 sm:h-48 md:h-64 object-cover rounded-2xl mb-6" alt="banner" />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-start gap-3">
            {t.thumbnail_url && <img src={t.thumbnail_url} className="w-20 h-20 rounded-xl object-cover" alt="thumb" />}
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>{t.status?.replace('_', ' ')}</span>
                {t.is_practice && <Badge color="gray" outline>Practice</Badge>}
                <Badge color="purple">{t.format?.replace('_', ' ')}</Badge>
                <Badge color="amber">{t.mode}</Badge>
              </div>
              <h1 className="text-2xl font-black text-white">{t.title}</h1>
              <p className="text-muted text-sm">{t.game_name} · {t.game_type}</p>
            </div>
          </div>
          {t.description && <Card className="p-4"><p className="text-sm text-white/80">{t.description}</p></Card>}
          {t.rules && <Card className="p-4"><h3 className="text-sm font-bold text-white mb-2">Rules</h3><p className="text-sm text-white/70 whitespace-pre-wrap">{t.rules}</p></Card>}

          {/* Players to Watch */}
          {topPlayers.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-bold text-white mb-3">⚡ Players to Watch</h3>
              <div className="space-y-3">
                {topPlayers.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <Avatar user={p.users} size={32} showName />
                    <div className="text-right text-xs">
                      <p className="text-white font-semibold">{winRate(p.player_stats?.tournaments_won, p.player_stats?.tournaments_played)}% win rate</p>
                      <p className="text-muted">{p.player_stats?.tournaments_won ?? 0} wins</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            {!t.is_practice && (
              <div className="text-center">
                <p className="text-xs text-muted mb-1">Prize Pool</p>
                <p className="text-3xl font-black text-accent">{formatTC(t.prize_pool_tc ?? 0)}</p>
              </div>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Entry Fee</span><span className="text-white font-semibold">{t.is_practice ? 'Free' : formatTC(t.entry_fee_tc)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Start</span><span className="text-white">{formatDateTime(t.start_date)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Deadline</span><span className="text-white">{formatDateTime(t.registration_deadline)}</span></div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted">
                <span>{t.current_participants}/{t.max_participants} players</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {t.registration_deadline && <CountdownTimer date={t.registration_deadline} label="Registration closes in" />}

            {isRegistered
              ? <div className="text-center py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-semibold">✓ Registered</div>
              : canRegister
                ? <Button className="w-full" onClick={() => setRegisterModal(true)}>
                    {t.entry_fee_tc > 0 ? `Register — ${formatTC(t.entry_fee_tc)}` : 'Register Free'}
                  </Button>
                : null
            }
          </Card>

          {/* Room & Chat (revealed) */}
          {isRegistered && t.room_revealed && (t.room_code || t.chat_group_link) && (
            <Card className="p-4 border-primary/30 bg-primary/5">
              <h3 className="text-sm font-bold text-white mb-3">Room Details</h3>
              {t.room_code && <div className="mb-2"><p className="text-xs text-muted">Room Code</p><p className="font-mono font-bold text-accent text-lg">{t.room_code}</p></div>}
              {t.room_password && <div className="mb-2"><p className="text-xs text-muted">Password</p><p className="font-mono text-white">{t.room_password}</p></div>}
              {t.chat_group_link && <a href={t.chat_group_link} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm" className="w-full">Join {t.chat_platform ?? 'Chat'} Group</Button></a>}
            </Card>
          )}
        </div>
      </div>

      {/* Winner Spotlight */}
      {t.status === 'completed' && winnerUser && (
        <div className="mb-8">
          <WinnerSpotlight winner={winnerUser} tournament={t} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-white/[0.08]">
        {['bracket', 'participants'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'participants' && (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {participants.length === 0 ? <div className="text-center py-12 text-muted">No participants yet</div>
              : participants.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 hover:bg-surface2 transition-colors">
                  <Avatar user={p.users} size={36} showName />
                  <Badge color={p.status === 'winner' ? 'gold' : 'gray'}>{p.status}</Badge>
                </div>
              ))}
          </div>
        </Card>
      )}

      {tab === 'bracket' && (
        <div className="space-y-3">
          {matches.length === 0 ? <div className="text-center py-12 text-muted">Bracket not generated yet</div>
            : matches.map(m => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <Avatar user={m.player1} size={32} showName />
                  <div className="text-center">
                    {m.status === 'completed' ? <span className="text-white font-bold">{m.player1_score} — {m.player2_score}</span> : <span className="text-muted text-xs">vs</span>}
                  </div>
                  <Avatar user={m.player2} size={32} showName />
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Register Modal */}
      <Modal open={registerModal} onClose={() => setRegisterModal(false)} title="Register for Tournament">
        <div className="space-y-4">
          {t.entry_fee_tc > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm">
              <div className="flex justify-between mb-1"><span className="text-muted">Entry Fee</span><span className="text-accent font-bold">{formatTC(t.entry_fee_tc)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Your Balance</span><span className="text-white">{formatTC(profile?.coin_balance ?? 0)}</span></div>
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-white/80">Game Tag</label>
            <input value={gameTag} onChange={e => setGameTag(e.target.value)} placeholder="Your in-game tag" className="w-full bg-surface2 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary" />
          </div>
          {t.mode === 'team' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-white/80">Team Name</label>
              <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Your team name" className="w-full bg-surface2 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary" />
            </div>
          )}
          <Button onClick={handleRegister} className="w-full">
            {t.entry_fee_tc > 0 ? `Confirm — ${formatTC(t.entry_fee_tc)}` : 'Register Free'}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
