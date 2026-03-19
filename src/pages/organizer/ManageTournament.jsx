import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import WinnerSpotlight from '../../components/tournament/WinnerSpotlight'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, formatDateTime, formatDate } from '../../lib/utils'
import { STATUS_COLORS, WITHDRAWAL_COMMISSION } from '../../lib/constants'
import { updatePlayerStats } from '../../lib/badges'
import { activateReferral } from '../../lib/referrals'
import toast from 'react-hot-toast'

const TABS = ['Overview', 'Participants', 'Bracket', 'Matches', 'Room & Chat', 'Financials', 'Settings']

export default function ManageTournament() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [matches, setMatches] = useState([])
  const [bracket, setBracket] = useState(null)
  const [tab, setTab] = useState('Overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [id])

  useEffect(() => {
    const channel = supabase.channel(`tournament:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` }, fetchParticipants)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, fetchMatches)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  async function fetchAll() {
    await Promise.all([fetchTournament(), fetchParticipants(), fetchMatches()])
    setLoading(false)
  }

  async function fetchTournament() {
    const { data } = await supabase.from('tournaments').select('*').eq('id', id).single()
    setTournament(data)
  }

  async function fetchParticipants() {
    const { data } = await supabase.from('participants').select('*, users(id, username, avatar_url, country)').eq('tournament_id', id).order('registered_at')
    setParticipants(data ?? [])
  }

  async function fetchMatches() {
    const { data } = await supabase.from('matches').select('*, player1:player1_id(id, username, avatar_url), player2:player2_id(id, username, avatar_url)').eq('tournament_id', id).order('round_number').order('match_number')
    setMatches(data ?? [])
  }

  async function advanceStatus() {
    const flow = { approved: 'published', published: 'ongoing', ongoing: 'completed' }
    const next = flow[tournament.status]
    if (!next) return
    const { data: fresh } = await supabase.from('tournaments').select('*').eq('id', id).single()
    await supabase.from('tournaments').update({ status: next }).eq('id', id)

    if (next === 'completed') {
      await handleTournamentCompletion(fresh ?? tournament)
    }

    fetchTournament()
    toast.success(`Status updated to ${next}`)
  }

  async function handleTournamentCompletion(t) {
    // Find winner
    const winner = participants.find(p => p.status === 'winner')
    if (winner && t.prize_pool_tc > 0 && !t.is_practice) {
      // Credit prize to winner
      await supabase.rpc('credit_coins', {
        p_user_id: winner.user_id,
        p_amount: t.prize_pool_tc,
        p_type: 'prize',
        p_description: `Prize: ${t.title}`,
        p_tournament_id: t.id,
      })
      // Update winner stats + badges
      await updatePlayerStats(winner.user_id, {
        won: true,
        prizeTC: t.prize_pool_tc,
        gameName: t.game_name,
        gameMode: t.mode,
      })
      // Activate referral if first tournament
      const { count } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', winner.user_id)
      if (count === 1) await activateReferral(winner.user_id)
    }

    // Update all other participants' stats
    for (const p of participants.filter(p => p.status !== 'winner')) {
      await updatePlayerStats(p.user_id, {
        won: false,
        prizeTC: 0,
        gameName: t.game_name,
        gameMode: t.mode,
      })
    }

    // Credit organizer earnings if enabled
    if (t.organizer_earnings_enabled && !t.is_practice) {
      const entryFees = (t.current_participants ?? 0) * (t.entry_fee_tc ?? 0)
      const gross = entryFees - (t.prize_pool_tc ?? 0)
      if (gross > 0) {
        await supabase.from('tournaments').update({ organizer_earnings_tc: gross }).eq('id', t.id)
        await supabase.rpc('credit_coins', {
          p_user_id: t.organizer_id,
          p_amount: gross,
          p_type: 'organizer_earnings',
          p_description: `Earnings from: ${t.title}`,
          p_tournament_id: t.id,
        })
      }
    }
  }

  if (loading) return <PageWrapper><Skeleton className="h-64" /></PageWrapper>
  if (!tournament) return <PageWrapper><div className="text-center py-20 text-muted">Tournament not found</div></PageWrapper>

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{tournament.title}</h1>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[tournament.status]}`}>{tournament.status?.replace('_', ' ')}</span>
        </div>
        {['approved','published','ongoing'].includes(tournament.status) && (
          <Button onClick={advanceStatus}>
            {tournament.status === 'approved' ? 'Publish' : tournament.status === 'published' ? 'Start' : 'Complete'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-white/[0.08] pb-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab tournament={tournament} participants={participants} />}
      {tab === 'Participants' && <ParticipantsTab participants={participants} tournamentId={id} onRefresh={fetchParticipants} />}
      {tab === 'Bracket' && <BracketTab tournament={tournament} participants={participants} matches={matches} onRefresh={fetchMatches} />}
      {tab === 'Matches' && <MatchesTab matches={matches} tournamentId={id} onRefresh={fetchMatches} />}
      {tab === 'Room & Chat' && <RoomChatTab tournament={tournament} onRefresh={fetchTournament} />}
      {tab === 'Financials' && <FinancialsTab tournament={tournament} participants={participants} />}
      {tab === 'Settings' && <SettingsTab tournament={tournament} onRefresh={fetchTournament} />}
    </PageWrapper>
  )
}

function OverviewTab({ tournament: t, participants }) {
  const shareUrl = `${window.location.origin}/tournament/${t.id}`
  const winnerParticipant = participants.find(p => p.status === 'winner')
  const winnerUser = winnerParticipant?.users
  return (
    <div className="space-y-6">
      {t.status === 'completed' && winnerUser && (
        <WinnerSpotlight winner={winnerUser} tournament={t} />
      )}
      {t.banner_url && <img src={t.banner_url} className="w-full h-48 object-cover rounded-xl" alt="banner" />}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Registered', value: `${t.current_participants}/${t.max_participants}` },
          { label: 'Prize Pool', value: `🪙 ${formatTC(t.prize_pool_tc)}` },
          { label: 'Entry Fee', value: t.is_practice ? 'Free' : `🪙 ${formatTC(t.entry_fee_tc)}` },
          { label: 'Start Date', value: formatDate(t.start_date) },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <div className="text-lg font-black text-white">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <p className="text-sm text-muted mb-2">Share Link</p>
        <div className="flex gap-2">
          <input readOnly value={shareUrl} className="flex-1 bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
          <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Copied!') }}>Copy</Button>
        </div>
        {t.join_code && (
          <div className="mt-3 flex gap-2 items-center">
            <span className="text-sm text-muted">Join Code:</span>
            <span className="font-mono font-bold text-accent">{t.join_code}</span>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(t.join_code); toast.success('Copied!') }}>Copy</Button>
          </div>
        )}
      </Card>
      {t.description && <Card className="p-4"><p className="text-sm text-white/80">{t.description}</p></Card>}
    </div>
  )
}

function ParticipantsTab({ participants, tournamentId, onRefresh }) {
  const [tab, setTab] = useState('all')

  async function updateStatus(userId, status) {
    await supabase.from('participants').update({ status }).eq('tournament_id', tournamentId).eq('user_id', userId)
    onRefresh()
    toast.success(status === 'approved' ? 'Participant approved' : 'Participant rejected')
  }

  async function removeParticipant(userId) {
    if (!confirm('Remove this participant?')) return
    await supabase.from('participants').delete().eq('tournament_id', tournamentId).eq('user_id', userId)
    onRefresh()
    toast.success('Participant removed')
  }

  const pending = participants.filter(p => p.status === 'pending')
  const approved = participants.filter(p => p.status === 'approved' || p.status === 'registered')
  const shown = tab === 'pending' ? pending : tab === 'approved' ? approved : participants

  return (
    <Card>
      <div className="p-4 border-b border-white/[0.06] flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2">
          {[['all', 'All', participants.length], ['pending', 'Pending', pending.length], ['approved', 'Approved', approved.length]].map(([v, l, c]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${tab === v ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>
              {l} {c > 0 && <span className="ml-1 text-xs opacity-70">{c}</span>}
            </button>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={() => {
          const csv = ['Username,Game Tag,Status,Registered'].concat(participants.map(p => `${p.users?.username},${p.game_tag},${p.status},${p.registered_at}`)).join('\n')
          const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'participants.csv'; a.click()
        }}>Export CSV</Button>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {shown.length === 0 ? (
          <div className="text-center py-12 text-muted">No participants</div>
        ) : shown.map(p => (
          <div key={p.id} className="flex items-center justify-between p-4 hover:bg-surface2 transition-colors">
            <div className="flex items-center gap-3">
              <Avatar user={p.users} size={36} showName />
              {p.game_tag && <span className="text-xs text-muted">#{p.game_tag}</span>}
              {p.team_name && <Badge color="purple">{p.team_name}</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Badge color={p.status === 'winner' ? 'gold' : p.status === 'eliminated' ? 'red' : p.status === 'pending' ? 'yellow' : p.status === 'approved' ? 'green' : 'gray'}>{p.status}</Badge>
              {p.status === 'pending' && (
                <>
                  <button onClick={() => updateStatus(p.user_id, 'approved')} className="text-xs px-2 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors">Approve</button>
                  <button onClick={() => updateStatus(p.user_id, 'rejected')} className="text-xs px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors">Reject</button>
                </>
              )}
              <button onClick={() => removeParticipant(p.user_id)} className="text-muted hover:text-red-400 transition-colors text-xs">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function BracketTab({ tournament, participants, matches, onRefresh }) {
  async function generateBracket() {
    const shuffled = [...participants].sort(() => Math.random() - 0.5)
    const rounds = []
    let round1 = []
    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i + 1]) {
        round1.push({ tournament_id: tournament.id, round_number: 1, match_number: Math.floor(i / 2) + 1, player1_id: shuffled[i].user_id, player2_id: shuffled[i + 1].user_id, status: 'pending' })
      }
    }
    if (round1.length > 0) {
      await supabase.from('matches').insert(round1)
      onRefresh()
      toast.success('Bracket generated!')
    }
  }

  const byRound = matches.reduce((acc, m) => { (acc[m.round_number] = acc[m.round_number] ?? []).push(m); return acc }, {})

  return (
    <div className="space-y-4">
      {matches.length === 0 && participants.length >= 2 && (
        <Button onClick={generateBracket}>Generate Bracket (Random Seeding)</Button>
      )}
      {Object.entries(byRound).map(([round, ms]) => (
        <div key={round}>
          <h3 className="text-sm font-bold text-muted mb-3">Round {round}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ms.map(m => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <Avatar user={m.player1} size={28} showName />
                  <span className="text-muted text-xs">vs</span>
                  <Avatar user={m.player2} size={28} showName />
                </div>
                {m.winner_id && <div className="mt-2 text-xs text-accent text-center">🏆 Winner: {m.winner_id === m.player1_id ? m.player1?.username : m.player2?.username}</div>}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchesTab({ matches, tournamentId, onRefresh }) {
  const [resultModal, setResultModal] = useState(null)
  const [scores, setScores] = useState({ p1: '', p2: '', winner: '' })

  async function reportResult() {
    const m = resultModal
    await supabase.from('matches').update({
      player1_score: Number(scores.p1),
      player2_score: Number(scores.p2),
      winner_id: scores.winner,
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', m.id)

    const loserId = scores.winner === m.player1_id ? m.player2_id : m.player1_id
    await supabase.from('participants')
      .update({ status: 'eliminated' })
      .eq('tournament_id', tournamentId)
      .eq('user_id', loserId)

    await supabase.from('participants')
      .update({ status: 'winner' })
      .eq('tournament_id', tournamentId)
      .eq('user_id', scores.winner)

    setResultModal(null)
    onRefresh()
    toast.success('Result reported!')
  }

  return (
    <div className="space-y-3">
      {matches.length === 0 ? <div className="text-center py-12 text-muted">No matches yet. Generate bracket first.</div> : matches.map(m => (
        <Card key={m.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar user={m.player1} size={32} showName />
              <span className="text-muted">vs</span>
              <Avatar user={m.player2} size={32} showName />
            </div>
            <div className="flex items-center gap-3">
              {m.status === 'completed'
                ? <span className="text-xs text-green-400">{m.player1_score} — {m.player2_score}</span>
                : <Button size="sm" onClick={() => { setResultModal(m); setScores({ p1: '', p2: '', winner: '' }) }}>Report Result</Button>
              }
            </div>
          </div>
        </Card>
      ))}
      <Modal open={!!resultModal} onClose={() => setResultModal(null)} title="Report Match Result">
        {resultModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label={`${resultModal.player1?.username} Score`} type="number" value={scores.p1} onChange={e => setScores(p => ({ ...p, p1: e.target.value }))} />
              <Input label={`${resultModal.player2?.username} Score`} type="number" value={scores.p2} onChange={e => setScores(p => ({ ...p, p2: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-white/80">Winner</label>
              <div className="grid grid-cols-2 gap-3">
                {[resultModal.player1, resultModal.player2].map(p => (
                  <button key={p?.id} onClick={() => setScores(prev => ({ ...prev, winner: p?.id }))}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${scores.winner === p?.id ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-muted hover:border-white/20'}`}>
                    🏆 {p?.username}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={reportResult} disabled={!scores.winner} className="w-full">Confirm Result</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function RoomChatTab({ tournament, onRefresh }) {
  const [form, setForm] = useState({ room_code: tournament.room_code ?? '', room_password: tournament.room_password ?? '', chat_group_link: tournament.chat_group_link ?? '', chat_platform: tournament.chat_platform ?? '', room_revealed: tournament.room_revealed ?? false })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('tournaments').update(form).eq('id', tournament.id)
    onRefresh()
    toast.success('Room details saved!')
    setSaving(false)
  }

  return (
    <Card className="p-6 space-y-4">
      <Input label="Room Code" value={form.room_code} onChange={e => setForm(p => ({ ...p, room_code: e.target.value }))} />
      <Input label="Room Password" value={form.room_password} onChange={e => setForm(p => ({ ...p, room_password: e.target.value }))} />
      <Input label="Chat Group Link" type="url" value={form.chat_group_link} onChange={e => setForm(p => ({ ...p, chat_group_link: e.target.value }))} />
      <div className="flex items-center justify-between bg-surface2 rounded-xl p-4">
        <div>
          <p className="text-sm font-semibold text-white">Reveal to Participants</p>
          <p className="text-xs text-muted">{form.room_revealed ? 'Participants can see room details' : 'Room details are hidden'}</p>
        </div>
        <button onClick={() => setForm(p => ({ ...p, room_revealed: !p.room_revealed }))}
          className={`w-12 h-6 rounded-full transition-colors ${form.room_revealed ? 'bg-primary' : 'bg-surface'} border border-white/10 relative`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.room_revealed ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <Button onClick={save} loading={saving}>Save Room Details</Button>
    </Card>
  )
}

function FinancialsTab({ tournament: t, participants }) {
  const entryFees = (t.current_participants ?? 0) * (t.entry_fee_tc ?? 0)
  const gross = entryFees - (t.prize_pool_tc ?? 0)
  const commission = Math.floor(gross * WITHDRAWAL_COMMISSION)
  const net = gross - commission

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Entry Fees Collected', value: `🪙 ${formatTC(entryFees)}` },
          { label: 'Prize Pool', value: `🪙 ${formatTC(t.prize_pool_tc ?? 0)}` },
          { label: 'Net Earnings', value: `🪙 ${formatTC(Math.max(0, net))}` },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <div className="text-lg font-black text-white">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <h3 className="text-sm font-bold text-white mb-3">Earnings Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">Entry Fees ({t.current_participants} × {formatTC(t.entry_fee_tc ?? 0)})</span><span className="text-white">🪙 {formatTC(entryFees)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Prize Pool</span><span className="text-red-400">- 🪙 {formatTC(t.prize_pool_tc ?? 0)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Gross Earnings</span><span className="text-white">🪙 {formatTC(gross)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Tourena {WITHDRAWAL_COMMISSION * 100}% commission</span><span className="text-red-400">- 🪙 {formatTC(commission)}</span></div>
          <div className="flex justify-between font-bold border-t border-white/10 pt-2 mt-2"><span className="text-white">You Withdraw</span><span className="text-accent">🪙 {formatTC(Math.max(0, net))}</span></div>
        </div>
      </Card>
    </div>
  )
}

function SettingsTab({ tournament, onRefresh }) {
  const [saving, setSaving] = useState(false)
  async function cancelTournament() {
    if (!confirm('Cancel this tournament? All entry fees will be refunded.')) return
    setSaving(true)
    await supabase.from('tournaments').update({ status: 'cancelled' }).eq('id', tournament.id)
    onRefresh()
    toast.success('Tournament cancelled')
    setSaving(false)
  }
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-white mb-4">Tournament Settings</h3>
      <div className="border-t border-red-500/20 pt-4 mt-4">
        <p className="text-sm text-muted mb-3">Cancelling will refund all entry fees to participants.</p>
        <Button variant="danger" onClick={cancelTournament} loading={saving}>Cancel Tournament</Button>
      </div>
    </Card>
  )
}
