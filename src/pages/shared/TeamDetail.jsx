import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Trophy, Shield, UserPlus, LogOut, Trash2, Edit2, X, Check, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Avatar from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function TeamDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState(null) // 'captain' | 'member' | null
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from('teams').select('*, captain:captain_id(id, username, avatar_url)').eq('id', id).single(),
      supabase.from('team_members').select('*, user:user_id(id, username, avatar_url, country)').eq('team_id', id).order('joined_at'),
    ])
    if (!t) { navigate('/teams'); return }
    setTeam(t)
    setMembers(m ?? [])
    const me = m?.find(mem => mem.user_id === profile.id)
    setMyRole(me?.role ?? null)
    setEditForm({ name: t.name, tag: t.tag, bio: t.bio ?? '', game_focus: t.game_focus ?? '', is_recruiting: t.is_recruiting })
    setLoading(false)
  }

  async function invitePlayer() {
    if (!inviteUsername.trim()) return
    setInviting(true)
    const { data: target } = await supabase.from('users').select('id, username').eq('username', inviteUsername.trim()).single()
    if (!target) { toast.error('User not found'); setInviting(false); return }
    if (members.find(m => m.user_id === target.id)) { toast.error('Already a member'); setInviting(false); return }
    const { error } = await supabase.from('team_invites').insert({ team_id: id, invited_by: profile.id, invitee_id: target.id })
    if (error) { toast.error(error.message.includes('unique') ? 'Invite already sent' : error.message); setInviting(false); return }
    toast.success(`Invite sent to ${target.username}`)
    setInviteUsername('')
    setInviting(false)
  }

  async function kickMember(userId) {
    if (!confirm('Remove this player from the team?')) return
    await supabase.from('team_members').delete().eq('team_id', id).eq('user_id', userId)
    await supabase.from('teams').update({ member_count: team.member_count - 1 }).eq('id', id)
    toast.success('Player removed')
    load()
  }

  async function leaveTeam() {
    if (!confirm('Leave this team?')) return
    await supabase.from('team_members').delete().eq('team_id', id).eq('user_id', profile.id)
    await supabase.from('teams').update({ member_count: team.member_count - 1 }).eq('id', id)
    toast.success('Left team')
    navigate('/teams')
  }

  async function disbandTeam() {
    if (!confirm('Disband this team permanently? This cannot be undone.')) return
    await supabase.from('teams').update({ status: 'disbanded' }).eq('id', id)
    toast.success('Team disbanded')
    navigate('/teams')
  }

  async function saveEdit() {
    setSaving(true)
    const { error } = await supabase.from('teams').update({
      ...editForm,
      tag: editForm.tag.toUpperCase().slice(0, 6),
    }).eq('id', id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Team updated')
    setEditing(false)
    load()
    setSaving(false)
  }

  async function uploadAvatar(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `teams/${id}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
    await supabase.from('teams').update({ avatar_url: publicUrl }).eq('id', id)
    toast.success('Avatar updated')
    load()
    setUploading(false)
  }

  if (loading) return (
    <PageWrapper><Skeleton className="h-48 rounded-2xl mb-4" /><Skeleton className="h-64 rounded-2xl" /></PageWrapper>
  )

  const isCaptain = myRole === 'captain'
  const isMember = !!myRole

  return (
    <PageWrapper>
      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative flex-shrink-0">
            {team.avatar_url
              ? <img src={team.avatar_url} className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/40" alt={team.name} />
              : <div className="w-20 h-20 rounded-2xl bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-xl font-black text-primary">{team.tag}</div>
            }
            {isCaptain && (
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-500 transition-colors">
                <Upload size={12} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
              </label>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Team name" className="flex-1" />
                  <Input value={editForm.tag} onChange={e => setEditForm(p => ({ ...p, tag: e.target.value.toUpperCase().slice(0, 6) }))} placeholder="TAG" className="w-24" />
                </div>
                <Input value={editForm.game_focus} onChange={e => setEditForm(p => ({ ...p, game_focus: e.target.value }))} placeholder="Game focus" />
                <textarea value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} rows={2} maxLength={300}
                  className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none" placeholder="Team bio..." />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.is_recruiting} onChange={e => setEditForm(p => ({ ...p, is_recruiting: e.target.checked }))} className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-white">Open to recruiting</span>
                </label>
                <div className="flex gap-2">
                  <Button size="sm" loading={saving} onClick={saveEdit}><Check size={14} className="mr-1" />Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X size={14} className="mr-1" />Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-black text-white">{team.name}</h1>
                  <span className="text-sm text-muted font-mono bg-surface2 px-2 py-0.5 rounded">[{team.tag}]</span>
                  {team.is_recruiting && <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Shield size={10} />Recruiting</span>}
                </div>
                {team.game_focus && <p className="text-muted text-sm mb-1">{team.game_focus}</p>}
                {team.bio && <p className="text-muted text-sm mb-3">{team.bio}</p>}
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1"><Users size={14} />{team.member_count} members</span>
                  <span className="flex items-center gap-1"><Trophy size={14} />{team.tournaments_won}W / {team.tournaments_played}P</span>
                  <span>Captain: <span className="text-white">{team.captain?.username}</span></span>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isCaptain && !editing && <Button size="sm" variant="secondary" onClick={() => setEditing(true)}><Edit2 size={14} className="mr-1" />Edit</Button>}
            {isMember && !isCaptain && <Button size="sm" variant="ghost" onClick={leaveTeam}><LogOut size={14} className="mr-1" />Leave</Button>}
            {isCaptain && <Button size="sm" variant="danger" onClick={disbandTeam}><Trash2 size={14} className="mr-1" />Disband</Button>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-white mb-4">Roster ({members.length})</h2>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
                  <div className="flex items-center gap-3">
                    <Avatar user={m.user} size={36} showName />
                    <div className="flex items-center gap-2">
                      {m.role === 'captain' && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Captain</span>}
                      {m.user?.country && <span className="text-xs text-muted">{m.user.country}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{formatDate(m.joined_at)}</span>
                    {isCaptain && m.user_id !== profile.id && (
                      <button onClick={() => kickMember(m.user_id)} className="text-muted hover:text-red-400 transition-colors p-1">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Invite panel (captain only) */}
        <div className="space-y-4">
          {isCaptain && (
            <Card className="p-5">
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2"><UserPlus size={16} />Invite Player</h2>
              <div className="flex gap-2">
                <input value={inviteUsername} onChange={e => setInviteUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && invitePlayer()}
                  placeholder="Username..."
                  className="flex-1 bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
                <Button size="sm" loading={inviting} onClick={invitePlayer}>Invite</Button>
              </div>
              <p className="text-xs text-muted mt-2">Player will receive an invite notification</p>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="text-base font-bold text-white mb-3">Team Stats</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Tournaments Played</span><span className="text-white font-semibold">{team.tournaments_played}</span></div>
              <div className="flex justify-between"><span className="text-muted">Tournaments Won</span><span className="text-white font-semibold">{team.tournaments_won}</span></div>
              <div className="flex justify-between"><span className="text-muted">Win Rate</span><span className="text-white font-semibold">{team.tournaments_played ? Math.round((team.tournaments_won / team.tournaments_played) * 100) : 0}%</span></div>
              <div className="flex justify-between"><span className="text-muted">Founded</span><span className="text-white font-semibold">{formatDate(team.created_at)}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
