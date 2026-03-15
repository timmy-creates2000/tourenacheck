import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

export default function Groups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [myIds, setMyIds] = useState(new Set())
  const [pendingIds, setPendingIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', is_private: false })
  const [saving, setSaving] = useState(false)
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [requestModal, setRequestModal] = useState(null)
  const [requestMsg, setRequestMsg] = useState('')

  useEffect(() => { fetchAll() }, [tab])

  async function fetchAll() {
    setLoading(true)
    let q = supabase.from('groups')
      .select('*, creator:owner_id(id,username,avatar_url), member_count:group_members(count)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (tab === 'mine') {
      const { data: mem } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
      const ids = (mem ?? []).map(m => m.group_id)
      if (!ids.length) { setGroups([]); setLoading(false); return }
      q = q.in('id', ids)
    } else {
      q = q.eq('is_private', false)
    }

    const { data } = await q.limit(50)
    setGroups(data ?? [])

    const [{ data: mem }, { data: reqs }] = await Promise.all([
      supabase.from('group_members').select('group_id').eq('user_id', user.id),
      supabase.from('group_join_requests').select('group_id').eq('user_id', user.id).eq('status', 'pending'),
    ])
    setMyIds(new Set((mem ?? []).map(m => m.group_id)))
    setPendingIds(new Set((reqs ?? []).map(r => r.group_id)))
    setLoading(false)
  }

  async function joinPublic(id) {
    const { error } = await supabase.from('group_members').insert({ group_id: id, user_id: user.id, role: 'member' })
    if (error) { toast.error(error.message); return }
    setMyIds(p => new Set([...p, id]))
    toast.success('Joined group')
  }

  async function joinWithCode() {
    if (!inviteCode.trim()) return
    const { data: g } = await supabase.from('groups').select('id,name,is_private').eq('invite_code', inviteCode.trim().toUpperCase()).single()
    if (!g) { toast.error('Invalid invite code'); return }
    const { error } = await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id, role: 'member' })
    if (error) { toast.error(error.message); return }
    setMyIds(p => new Set([...p, g.id]))
    setInviteModal(false)
    setInviteCode('')
    fetchAll()
    toast.success(`Joined ${g.name}`)
  }

  async function requestJoin(group) {
    setRequestModal(group)
    setRequestMsg('')
  }

  async function submitRequest() {
    const { error } = await supabase.from('group_join_requests').insert({
      group_id: requestModal.id,
      user_id: user.id,
      message: requestMsg.trim() || null,
    })
    if (error) { toast.error(error.message); return }
    setPendingIds(p => new Set([...p, requestModal.id]))
    setRequestModal(null)
    toast.success('Join request sent')
  }

  async function leave(id) {
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', user.id)
    setMyIds(p => { const s = new Set(p); s.delete(id); return s })
    toast.success('Left group')
  }

  async function create() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('groups')
      .insert({ name: form.name, description: form.description, owner_id: user.id, is_private: form.is_private })
      .select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id, role: 'owner' })
    setCreating(false)
    setForm({ name: '', description: '', is_private: false })
    fetchAll()
    toast.success('Group created')
    setSaving(false)
  }

  const filtered = groups.filter(g => g.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-black text-white">Groups</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setInviteModal(true)}>Join with Code</Button>
          <Button size="sm" onClick={() => setCreating(true)}>Create Group</Button>
        </div>
      </div>

      {creating && (
        <Card className="p-5 mb-6 border-primary/20">
          <h2 className="text-base font-bold text-white mb-4">New Group</h2>
          <div className="space-y-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Group name"
              className="w-full bg-surface2 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary" />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)" rows={2}
              className="w-full bg-surface2 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary resize-none" />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="radio" name="gvis" checked={!form.is_private} onChange={() => setForm(p => ({ ...p, is_private: false }))} className="accent-primary" />
                Public — anyone can join
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="radio" name="gvis" checked={form.is_private} onChange={() => setForm(p => ({ ...p, is_private: true }))} className="accent-primary" />
                Private — invite code only
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={create} loading={saving}>Create</Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 border-b border-white/[0.08]">
          {['all', 'mine'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
              {t === 'all' ? 'All Groups' : 'My Groups'}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups..."
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary w-48" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
          : filtered.length === 0 ? <div className="col-span-3 text-center py-16 text-muted">No groups found</div>
          : filtered.map(g => {
            const isMember = myIds.has(g.id)
            const isPending = pendingIds.has(g.id)
            const isCreator = g.owner_id === user.id
            const count = g.member_count?.[0]?.count ?? 0
            return (
              <Card key={g.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link to={`/group/${g.id}`} className="text-base font-bold text-white hover:text-primary transition-colors block truncate">{g.name}</Link>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {g.is_private && <Badge color="gray">Private</Badge>}
                    {isCreator && <Badge color="purple">Owner</Badge>}
                  </div>
                </div>
                {g.description && <p className="text-xs text-muted line-clamp-2">{g.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted mt-auto">
                  <span>{count} / {g.max_members} members</span>
                  <span>by {g.creator?.username}</span>
                </div>
                {!isCreator && !isMember && (
                  <button
                    onClick={() => g.is_private ? requestJoin(g) : joinPublic(g.id)}
                    disabled={isPending}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${isPending ? 'bg-surface2 text-muted cursor-not-allowed' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>
                    {isPending ? 'Request Pending' : g.is_private ? 'Request to Join' : 'Join'}
                  </button>
                )}
                {isMember && (
                  <div className="flex gap-2">
                    <Link to={`/group/${g.id}`} className="flex-1 py-2 rounded-lg text-sm font-semibold text-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      Open Chat
                    </Link>
                    {!isCreator && (
                      <button onClick={() => leave(g.id)} className="px-3 py-2 rounded-lg text-sm text-muted hover:text-red-400 hover:bg-surface2 transition-colors">
                        Leave
                      </button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
      </div>

      {/* Join with invite code modal */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-white mb-2">Join with Invite Code</h2>
            <p className="text-sm text-muted mb-4">Enter the invite code shared by the group owner.</p>
            <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB12CD34"
              className="w-full bg-surface2 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-primary mb-4" />
            <div className="flex gap-2">
              <Button onClick={joinWithCode} className="flex-1">Join</Button>
              <Button variant="ghost" onClick={() => setInviteModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Request to join modal */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-white mb-1">Request to Join</h2>
            <p className="text-sm text-muted mb-4">{requestModal.name} is a private group. Your request will be reviewed by the owner.</p>
            <textarea value={requestMsg} onChange={e => setRequestMsg(e.target.value)} rows={3}
              placeholder="Introduce yourself (optional)..."
              className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary resize-none mb-4" />
            <div className="flex gap-2">
              <Button onClick={submitRequest} className="flex-1">Send Request</Button>
              <Button variant="ghost" onClick={() => setRequestModal(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
