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

export default function Communities() {
  const { user, profile } = useAuth()
  const [communities, setCommunities] = useState([])
  const [myIds, setMyIds] = useState(new Set())
  const [pendingIds, setPendingIds] = useState(new Set()) // communities where I have a pending request
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', is_public: true, game_focus: '' })
  const [saving, setSaving] = useState(false)
  const [requestModal, setRequestModal] = useState(null) // community object
  const [requestMsg, setRequestMsg] = useState('')

  useEffect(() => { fetchAll() }, [tab])

  async function fetchAll() {
    setLoading(true)
    let q = supabase.from('communities')
      .select('*, owner:owner_id(id,username,avatar_url), member_count:community_members(count)')
      .eq('status', 'active')
      .order('member_count', { ascending: false })

    if (tab === 'mine') {
      const { data: mem } = await supabase.from('community_members').select('community_id').eq('user_id', user.id)
      const ids = (mem ?? []).map(m => m.community_id)
      if (!ids.length) { setCommunities([]); setLoading(false); return }
      q = q.in('id', ids)
    } else {
      q = q.eq('is_public', true)
    }

    const { data } = await q.limit(50)
    setCommunities(data ?? [])

    const [{ data: mem }, { data: reqs }] = await Promise.all([
      supabase.from('community_members').select('community_id').eq('user_id', user.id),
      supabase.from('community_join_requests').select('community_id').eq('user_id', user.id).eq('status', 'pending'),
    ])
    setMyIds(new Set((mem ?? []).map(m => m.community_id)))
    setPendingIds(new Set((reqs ?? []).map(r => r.community_id)))
    setLoading(false)
  }

  async function joinPublic(id) {
    const { error } = await supabase.from('community_members').insert({ community_id: id, user_id: user.id, role: 'member' })
    if (error) { toast.error(error.message); return }
    setMyIds(p => new Set([...p, id]))
    toast.success('Joined community')
  }

  async function requestJoin(community) {
    setRequestModal(community)
    setRequestMsg('')
  }

  async function submitRequest() {
    const { error } = await supabase.from('community_join_requests').insert({
      community_id: requestModal.id,
      user_id: user.id,
      message: requestMsg.trim() || null,
    })
    if (error) { toast.error(error.message); return }
    setPendingIds(p => new Set([...p, requestModal.id]))
    setRequestModal(null)
    toast.success('Join request sent')
  }

  async function leave(id) {
    await supabase.from('community_members').delete().eq('community_id', id).eq('user_id', user.id)
    setMyIds(p => { const s = new Set(p); s.delete(id); return s })
    toast.success('Left community')
  }

  async function create() {
    if (!form.name.trim()) return
    setSaving(true)
    const base = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
    const { data, error } = await supabase.from('communities')
      .insert({ name: form.name, description: form.description, slug, owner_id: user.id, is_public: form.is_public, game_focus: form.game_focus || null })
      .select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    await supabase.from('community_members').insert({ community_id: data.id, user_id: user.id, role: 'owner' })
    setCreating(false)
    setForm({ name: '', description: '', is_public: true, game_focus: '' })
    fetchAll()
    toast.success('Community created')
    setSaving(false)
  }

  const filtered = communities.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-black text-white">Communities</h1>
        {(profile?.role === 'organizer' || profile?.is_admin) && (
          <Button onClick={() => setCreating(true)} size="sm">Create Community</Button>
        )}
      </div>

      {creating && (
        <Card className="p-5 mb-6 border-primary/20">
          <h2 className="text-base font-bold text-white mb-4">New Community</h2>
          <div className="space-y-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Community name"
              className="w-full bg-surface2 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary" />
            <input value={form.game_focus} onChange={e => setForm(p => ({ ...p, game_focus: e.target.value }))}
              placeholder="Game focus (e.g. FIFA, Valorant)"
              className="w-full bg-surface2 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary" />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)" rows={2}
              className="w-full bg-surface2 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary resize-none" />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="radio" name="visibility" checked={form.is_public} onChange={() => setForm(p => ({ ...p, is_public: true }))} className="accent-primary" />
                Public — anyone can join
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="radio" name="visibility" checked={!form.is_public} onChange={() => setForm(p => ({ ...p, is_public: false }))} className="accent-primary" />
                Private — approval required
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={create} loading={saving} size="sm">Create</Button>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 border-b border-white/[0.08]">
          {['all', 'mine'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
              {t === 'all' ? 'All Communities' : 'My Communities'}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities..."
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary w-52" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
          : filtered.length === 0 ? <div className="col-span-3 text-center py-16 text-muted">No communities found</div>
          : filtered.map(c => {
            const isMember = myIds.has(c.id)
            const isPending = pendingIds.has(c.id)
            const isOwner = c.owner_id === user.id
            const count = c.member_count?.[0]?.count ?? 0
            return (
              <Card key={c.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link to={`/community/${c.slug}`} className="text-base font-bold text-white hover:text-primary transition-colors block truncate">{c.name}</Link>
                    {c.game_focus && <p className="text-xs text-primary/70 mt-0.5">{c.game_focus}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!c.is_public && <Badge color="gray">Private</Badge>}
                    {isOwner && <Badge color="amber">Owner</Badge>}
                  </div>
                </div>
                {c.description && <p className="text-xs text-muted line-clamp-2">{c.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted mt-auto">
                  <span>{count} members</span>
                  <span>by {c.owner?.username}</span>
                </div>
                {!isOwner && !isMember && (
                  <button
                    onClick={() => c.is_public ? joinPublic(c.id) : requestJoin(c)}
                    disabled={isPending}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${isPending ? 'bg-surface2 text-muted cursor-not-allowed' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>
                    {isPending ? 'Request Pending' : c.is_public ? 'Join' : 'Request to Join'}
                  </button>
                )}
                {isMember && (
                  <div className="flex gap-2">
                    <Link to={`/community/${c.slug}`} className="flex-1 py-2 rounded-lg text-sm font-semibold text-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      Open
                    </Link>
                    {!isOwner && (
                      <button onClick={() => leave(c.id)} className="px-3 py-2 rounded-lg text-sm text-muted hover:text-red-400 hover:bg-surface2 transition-colors">
                        Leave
                      </button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
      </div>

      {/* Request to join modal */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-white mb-1">Request to Join</h2>
            <p className="text-sm text-muted mb-4">{requestModal.name} is a private community. Your request will be reviewed by the owner.</p>
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
