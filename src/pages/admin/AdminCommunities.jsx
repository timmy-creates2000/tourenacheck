import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { timeAgo } from '../../lib/utils'

export default function AdminCommunities() {
  const [tab, setTab] = useState('communities')
  const [communities, setCommunities] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState(null)

  async function loadCommunities() {
    const { data, error } = await supabase
      .from('communities')
      .select('*, owner:owner_id(username, avatar_url)')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setCommunities(data)
  }

  async function loadGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('*, owner:owner_id(username, avatar_url)')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setGroups(data)
  }

  async function load() {
    setLoading(true)
    await Promise.all([loadCommunities(), loadGroups()])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function setCommunityStatus(id, status) {
    setActing(id)
    const { error } = await supabase.from('communities').update({ status }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(`Community ${status}`); loadCommunities() }
    setActing(null)
  }

  async function setGroupStatus(id, status) {
    setActing(id)
    const { error } = await supabase.from('groups').update({ status }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(`Group ${status}`); loadGroups() }
    setActing(null)
  }

  async function verifyCommunity(id, is_verified) {
    setActing(id)
    const { error } = await supabase.from('communities').update({ is_verified }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(is_verified ? 'Community verified' : 'Verification removed'); loadCommunities() }
    setActing(null)
  }

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.owner?.username?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.owner?.username?.toLowerCase().includes(search.toLowerCase())
  )

  const STATUS_COLORS = { active: 'text-green-400 bg-green-500/10', suspended: 'text-red-400 bg-red-500/10', deleted: 'text-muted bg-surface2' }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Communities & Groups</h1>
        <p className="text-muted text-sm mt-1">Moderate organizer communities and player groups</p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex bg-surface2 rounded-lg p-1 gap-1">
          {[['communities','🏘️ Communities'],['groups','👾 Groups']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or owner..."
          className="flex-1 bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder:text-muted" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : tab === 'communities' ? (
        <div className="space-y-3">
          {filteredCommunities.length === 0 ? <div className="text-center py-16 text-muted">No communities found</div>
            : filteredCommunities.map(c => (
            <div key={c.id} className="bg-surface border border-white/10 rounded-xl p-4 flex items-center gap-4">
              {c.avatar_url
                ? <img src={c.avatar_url} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt={c.name} />
                : <div className="w-12 h-12 rounded-xl bg-surface2 flex items-center justify-center text-xl flex-shrink-0">🏘️</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{c.name}</span>
                  {c.is_verified && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">✓ Verified</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                  {!c.is_public && <span className="text-xs bg-surface2 text-muted px-2 py-0.5 rounded-full">Private</span>}
                </div>
                <p className="text-xs text-muted mt-1">Owner: {c.owner?.username} · {c.member_count} members{c.game_focus ? ` · ${c.game_focus}` : ''}</p>
                <p className="text-xs text-muted">{timeAgo(c.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <button onClick={() => verifyCommunity(c.id, !c.is_verified)} disabled={acting === c.id}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${c.is_verified ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10' : 'border-white/20 text-muted hover:text-white hover:bg-surface2'}`}>
                  {c.is_verified ? 'Unverify' : 'Verify'}
                </button>
                {c.status === 'active'
                  ? <button onClick={() => setCommunityStatus(c.id, 'suspended')} disabled={acting === c.id} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">Suspend</button>
                  : <button onClick={() => setCommunityStatus(c.id, 'active')} disabled={acting === c.id} className="text-xs px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">Restore</button>
                }
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.length === 0 ? <div className="text-center py-16 text-muted">No groups found</div>
            : filteredGroups.map(g => (
            <div key={g.id} className="bg-surface border border-white/10 rounded-xl p-4 flex items-center gap-4">
              {g.avatar_url
                ? <img src={g.avatar_url} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt={g.name} />
                : <div className="w-12 h-12 rounded-xl bg-surface2 flex items-center justify-center text-xl flex-shrink-0">👾</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{g.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[g.status]}`}>{g.status}</span>
                  {g.is_private && <span className="text-xs bg-surface2 text-muted px-2 py-0.5 rounded-full">Private</span>}
                </div>
                <p className="text-xs text-muted mt-1">Owner: {g.owner?.username} · {g.member_count}/{g.max_members} members</p>
                <p className="text-xs text-muted">{timeAgo(g.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {g.status === 'active'
                  ? <button onClick={() => setGroupStatus(g.id, 'suspended')} disabled={acting === g.id} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">Suspend</button>
                  : <button onClick={() => setGroupStatus(g.id, 'active')} disabled={acting === g.id} className="text-xs px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">Restore</button>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
