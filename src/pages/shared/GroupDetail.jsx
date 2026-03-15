/**
 * GroupDetail.jsx
 *
 * Full group chat + member management page.
 *
 * Tabs:
 *  - Chat: real-time group messaging via Supabase Realtime
 *  - Members: list of all members with online indicator; owner can kick or promote
 *  - Requests: (owner/admin only) pending join requests with approve/reject
 *  - Info: invite code display (owner only) + group metadata
 *
 * Access rules:
 *  - Public groups: anyone can view; must be a member to send messages
 *  - Private groups: only members can view chat; join via invite code or request
 *  - Owner/admin can approve/reject join requests, remove members, promote to admin
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { timeAgo } from '../../lib/utils'
import ReportButton from '../../components/ui/ReportButton'
import toast from 'react-hot-toast'

function Avatar({ user, size = 32 }) {
  const s = `${size}px`
  if (user?.avatar_url)
    return <img src={user.avatar_url} style={{ width: s, height: s }} className="rounded-full object-cover flex-shrink-0" alt="" />
  return (
    <div style={{ width: s, height: s }} className="rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
      {(user?.username ?? '?').slice(0, 2).toUpperCase()}
    </div>
  )
}

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [group, setGroup] = useState(null)
  const [myRole, setMyRole] = useState(null) // 'owner' | 'admin' | 'member' | null
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [tab, setTab] = useState('chat')
  const [codeCopied, setCodeCopied] = useState(false)

  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  const isMember = !!myRole
  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin'

  useEffect(() => { fetchAll() }, [id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }, [])

  async function fetchAll() {
    const [{ data: g }, { data: msgs }, { data: mems }, { data: myMem }] = await Promise.all([
      supabase.from('groups').select('*, creator:owner_id(id,username,avatar_url)').eq('id', id).single(),
      supabase.from('group_messages')
        .select('*, sender:sender_id(id,username,avatar_url)')
        .eq('group_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase.from('group_members')
        .select('*, user:user_id(id,username,avatar_url,is_online)')
        .eq('group_id', id),
      supabase.from('group_members')
        .select('role')
        .eq('group_id', id)
        .eq('user_id', user.id)
        .single(),
    ])

    setGroup(g)
    setMessages(msgs ?? [])
    setMembers(mems ?? [])
    setMyRole(myMem?.role ?? null)

    // Load pending join requests for owner/admin
    if (myMem?.role === 'owner' || myMem?.role === 'admin') {
      const { data: reqs } = await supabase.from('group_join_requests')
        .select('*, requester:user_id(id,username,avatar_url)')
        .eq('group_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      setJoinRequests(reqs ?? [])
    }

    setLoading(false)

    // Subscribe to real-time new messages
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase.channel(`group:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${id}`
      }, async (payload) => {
        const { data: sender } = await supabase
          .from('users').select('id,username,avatar_url').eq('id', payload.new.sender_id).single()
        setMessages(prev => [...prev, { ...payload.new, sender }])
      })
      .subscribe()
  }

  async function send() {
    if (!text.trim() || !isMember) return
    const content = text.trim()
    setText('')
    const { error } = await supabase.from('group_messages')
      .insert({ group_id: id, sender_id: user.id, content })
    if (error) toast.error(error.message)
  }

  async function removeMember(memberId) {
    if (!window.confirm('Remove this member from the group?')) return
    await supabase.from('group_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
    toast.success('Member removed')
  }

  async function promoteMember(memberId) {
    await supabase.from('group_members').update({ role: 'admin' }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'admin' } : m))
    toast.success('Promoted to admin')
  }

  async function demoteMember(memberId) {
    await supabase.from('group_members').update({ role: 'member' }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'member' } : m))
    toast.success('Demoted to member')
  }

  async function reviewRequest(reqId, userId, approve) {
    if (approve) {
      const { error } = await supabase.from('group_members')
        .insert({ group_id: id, user_id: userId, role: 'member' })
      if (error) { toast.error(error.message); return }
    }
    await supabase.from('group_join_requests').update({
      status: approve ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', reqId)
    setJoinRequests(prev => prev.filter(r => r.id !== reqId))
    if (approve) {
      // Refresh member list
      const { data: mems } = await supabase.from('group_members')
        .select('*, user:user_id(id,username,avatar_url,is_online)').eq('group_id', id)
      setMembers(mems ?? [])
    }
    toast.success(approve ? 'Request approved' : 'Request rejected')
  }

  function copyInviteCode() {
    navigator.clipboard.writeText(group.invite_code ?? '')
    setCodeCopied(true)
    toast.success('Invite code copied')
    setTimeout(() => setCodeCopied(false), 2000)
  }

  if (loading) return (
    <PageWrapper>
      <Skeleton className="h-20 mb-4" />
      <Skeleton className="h-96" />
    </PageWrapper>
  )
  if (!group) return <PageWrapper><div className="text-center py-20 text-muted">Group not found</div></PageWrapper>

  const tabs = [
    'chat',
    'members',
    ...(isOwnerOrAdmin ? ['requests'] : []),
    ...(myRole === 'owner' ? ['info'] : []),
  ]

  return (
    <PageWrapper className="max-w-4xl">
      <Link to="/groups" className="text-sm text-muted hover:text-white transition-colors mb-4 inline-block">
        Back to Groups
      </Link>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">{group.name}</h1>
            {group.is_private && <Badge color="gray">Private</Badge>}
          </div>
          {group.description && <p className="text-sm text-muted mt-0.5">{group.description}</p>}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{members.length} / {group.max_members} members</span>
          {myRole && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${myRole === 'owner' ? 'bg-amber-500/20 text-amber-400' : myRole === 'admin' ? 'bg-primary/20 text-primary' : 'bg-surface2 text-muted'}`}>
              {myRole}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-white/[0.08]">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
            {t}
            {t === 'requests' && joinRequests.length > 0 && (
              <span className="ml-1.5 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{joinRequests.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Chat tab */}
      {tab === 'chat' && (
        <Card className="flex flex-col" style={{ height: '62vh' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0
              ? <div className="text-center py-12 text-muted text-sm">No messages yet. Say hello!</div>
              : messages.map(m => {
                const isMe = m.sender_id === user.id
                return (
                  <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && <Avatar user={m.sender} size={28} />}
                    <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && <span className="text-[10px] text-muted px-1">{m.sender?.username}</span>}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-surface2 text-white rounded-bl-sm'}`}>
                        {m.content}
                      </div>
                      <div className={`flex items-center gap-2 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] text-muted">{timeAgo(m.created_at)}</span>
                        {!isMe && <ReportButton targetType="message" targetId={m.id} className="text-[10px]" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            <div ref={bottomRef} />
          </div>

          {isMember ? (
            <div className="p-3 border-t border-white/[0.06] flex gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Message the group..."
                className="flex-1 bg-surface2 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="bg-primary hover:bg-primary/80 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                Send
              </button>
            </div>
          ) : (
            <div className="p-3 border-t border-white/[0.06] text-center text-sm text-muted">
              Join this group to send messages
            </div>
          )}
        </Card>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-4">
                <div className="relative">
                  <Avatar user={m.user} size={36} />
                  {m.user?.is_online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-surface" />
                  )}
                </div>
                <div className="flex-1">
                  <Link to={`/profile/${m.user?.username}`} className="text-sm font-semibold text-white hover:text-primary">
                    {m.user?.username}
                  </Link>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.role === 'owner' ? 'bg-amber-500/20 text-amber-400' : m.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-surface2 text-muted'}`}>
                  {m.role}
                </span>
                {/* Owner can manage non-owner members */}
                {myRole === 'owner' && m.user?.id !== user.id && m.role !== 'owner' && (
                  <div className="flex gap-1">
                    {m.role === 'member' && (
                      <button onClick={() => promoteMember(m.id)}
                        className="text-xs text-muted hover:text-primary transition-colors px-2 py-1 rounded hover:bg-surface2">
                        Promote
                      </button>
                    )}
                    {m.role === 'admin' && (
                      <button onClick={() => demoteMember(m.id)}
                        className="text-xs text-muted hover:text-amber-400 transition-colors px-2 py-1 rounded hover:bg-surface2">
                        Demote
                      </button>
                    )}
                    <button onClick={() => removeMember(m.id)}
                      className="text-xs text-muted hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-surface2">
                      Remove
                    </button>
                  </div>
                )}
                {/* Admin can remove regular members */}
                {myRole === 'admin' && m.role === 'member' && m.user?.id !== user.id && (
                  <button onClick={() => removeMember(m.id)}
                    className="text-xs text-muted hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-surface2">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Join requests tab (owner/admin only) */}
      {tab === 'requests' && isOwnerOrAdmin && (
        <div className="space-y-3">
          {joinRequests.length === 0
            ? <div className="text-center py-16 text-muted">No pending join requests</div>
            : joinRequests.map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar user={r.requester} size={40} />
                  <div className="flex-1">
                    <Link to={`/profile/${r.requester?.username}`} className="text-sm font-semibold text-white hover:text-primary">
                      {r.requester?.username}
                    </Link>
                    <p className="text-xs text-muted">{timeAgo(r.created_at)}</p>
                    {r.message && (
                      <p className="text-sm text-white/80 mt-1 bg-surface2 rounded-lg px-3 py-2">{r.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => reviewRequest(r.id, r.user_id, true)}
                      className="px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg text-xs font-semibold transition-colors">
                      Approve
                    </button>
                    <button onClick={() => reviewRequest(r.id, r.user_id, false)}
                      className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-xs font-semibold transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Info tab (owner only) — shows invite code */}
      {tab === 'info' && myRole === 'owner' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">Invite Code</h3>
            <p className="text-xs text-muted mb-3">
              Share this code with people you want to invite. They can use it on the Groups page to join directly.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-surface2 border border-white/10 rounded-xl px-5 py-3 text-center">
                <span className="text-2xl font-black text-accent tracking-widest font-mono">{group.invite_code}</span>
              </div>
              <button onClick={copyInviteCode}
                className="px-4 py-3 bg-primary hover:bg-primary/80 text-white rounded-xl text-sm font-semibold transition-colors">
                {codeCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">Group Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Visibility</span>
                <span className="text-white">{group.is_private ? 'Private' : 'Public'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Members</span>
                <span className="text-white">{members.length} / {group.max_members}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Owner</span>
                <span className="text-white">{group.creator?.username}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageWrapper>
  )
}
