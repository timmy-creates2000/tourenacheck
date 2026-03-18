import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users, Trophy, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', tag: '', bio: '', game_focus: '', is_recruiting: false }

export default function Teams() {
  const { profile } = useAuth()
  const [teams, setTeams] = useState([])
  const [myTeam, setMyTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [pendingInvites, setPendingInvites] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: allTeams }, { data: membership }, { data: invites }] = await Promise.all([
      supabase.from('teams').select('*, captain:captain_id(username, avatar_url)').eq('status', 'active').order('tournaments_won', { ascending: false }),
      supabase.from('team_members').select('team_id, role, teams(*)').eq('user_id', profile.id).single(),
      supabase.from('team_invites').select('*, team:team_id(id, name, tag, avatar_url, member_count), inviter:invited_by(username)').eq('invitee_id', profile.id).eq('status', 'pending'),
    ])
    setTeams(allTeams ?? [])
    setMyTeam(membership?.teams ?? null)
    setPendingInvites(invites ?? [])
    setLoading(false)
  }

  async function createTeam() {
    if (!form.name.trim() || !form.tag.trim()) { toast.error('Name and tag are required'); return }
    if (form.tag.length > 6) { toast.error('Tag must be 6 characters or less'); return }
    if (myTeam) { toast.error('You are already in a team'); return }
    setSaving(true)
    const { data: team, error } = await supabase.from('teams').insert({
      ...form,
      tag: form.tag.toUpperCase(),
      captain_id: profile.id,
    }).select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    await supabase.from('team_members').insert({ team_id: team.id, user_id: profile.id, role: 'captain' })
    toast.success('Team created!')
    setShowCreate(false)
    setForm(EMPTY_FORM)
    load()
    setSaving(false)
  }

  async function acceptInvite(invite) {
    if (myTeam) { toast.error('Leave your current team first'); return }
    const { error } = await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id)
    if (error) { toast.error(error.message); return }
    await supabase.from('team_members').insert({ team_id: invite.team_id, user_id: profile.id, role: 'member' })
    await supabase.from('teams').update({ member_count: invite.team.member_count + 1 }).eq('id', invite.team_id)
    toast.success(`Joined ${invite.team.name}!`)
    load()
  }

  async function declineInvite(id) {
    await supabase.from('team_invites').update({ status: 'declined' }).eq('id', id)
    load()
  }

  const filtered = teams.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.tag.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Teams</h1>
          <p className="text-muted text-sm mt-1">Find a team or create your own</p>
        </div>
        {!myTeam && (
          <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" />Create Team</Button>
        )}
        {myTeam && (
          <Link to={`/team/${myTeam.id}`}>
            <Button variant="secondary">My Team: [{myTeam.tag}] {myTeam.name}</Button>
          </Link>
        )}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6 space-y-2">
          {pendingInvites.map(inv => (
            <div key={inv.id} className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {inv.team.avatar_url
                  ? <img src={inv.team.avatar_url} className="w-10 h-10 rounded-lg object-cover" alt="" />
                  : <div className="w-10 h-10 rounded-lg bg-primary/30 flex items-center justify-center text-sm font-black text-white">{inv.team.tag}</div>
                }
                <div>
                  <p className="text-white font-semibold text-sm">{inv.team.name} invited you to join</p>
                  <p className="text-muted text-xs">Invited by {inv.inviter?.username}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => acceptInvite(inv)}>Accept</Button>
                <Button size="sm" variant="ghost" onClick={() => declineInvite(inv.id)}>Decline</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams..."
          className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
      </div>

      {/* Teams grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted">No teams found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(team => (
            <Link key={team.id} to={`/team/${team.id}`}>
              <Card className="p-5 hover:border-primary/40 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-3 mb-3">
                  {team.avatar_url
                    ? <img src={team.avatar_url} className="w-12 h-12 rounded-xl object-cover" alt={team.name} />
                    : <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">{team.tag}</div>
                  }
                  <div className="min-w-0">
                    <p className="text-white font-bold truncate">{team.name}</p>
                    <p className="text-muted text-xs">[{team.tag}] · {team.game_focus ?? 'All games'}</p>
                  </div>
                </div>
                {team.bio && <p className="text-muted text-xs mb-3 line-clamp-2">{team.bio}</p>}
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1"><Users size={12} />{team.member_count} members</span>
                  <span className="flex items-center gap-1"><Trophy size={12} />{team.tournaments_won}W / {team.tournaments_played}P</span>
                  {team.is_recruiting && <span className="text-green-400 flex items-center gap-1"><Shield size={12} />Recruiting</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Create Team</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <Input label="Team Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Shadow Wolves" />
              <Input label="Team Tag * (max 6 chars)" value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value.toUpperCase().slice(0, 6) }))} placeholder="e.g. SWF" />
              <Input label="Game Focus" value={form.game_focus} onChange={e => setForm(p => ({ ...p, game_focus: e.target.value }))} placeholder="e.g. FIFA 25, Valorant..." />
              <div>
                <label className="text-xs text-muted mb-1 block">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} maxLength={300}
                  className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none"
                  placeholder="Tell players about your team..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_recruiting} onChange={e => setForm(p => ({ ...p, is_recruiting: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-white">Open to recruiting</span>
              </label>
            </div>
            <div className="flex gap-3 p-5 border-t border-white/10">
              <Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" loading={saving} onClick={createTeam}>Create Team</Button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
