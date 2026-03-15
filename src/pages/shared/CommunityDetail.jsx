import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
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

export default function CommunityDetail() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [community, setCommunity] = useState(null)
  const [myRole, setMyRole] = useState(null) // 'owner' | 'moderator' | 'member' | null
  const [posts, setPosts] = useState([])
  const [members, setMembers] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('posts')
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [expandedComments, setExpandedComments] = useState(new Set())
  const [comments, setComments] = useState({})
  const [commentText, setCommentText] = useState({})

  const isMember = !!myRole
  const isOwnerOrMod = myRole === 'owner' || myRole === 'moderator'

  useEffect(() => { fetchAll() }, [slug])

  async function fetchAll() {
    const { data: c } = await supabase.from('communities')
      .select('*, owner:owner_id(id,username,avatar_url)')
      .eq('slug', slug).single()
    if (!c) { setLoading(false); return }
    setCommunity(c)

    const [{ data: p }, { data: mem }, { data: myMem }] = await Promise.all([
      supabase.from('community_posts')
        .select('*, author:author_id(id,username,avatar_url), likes:community_post_likes(count), comments:community_comments(count)')
        .eq('community_id', c.id)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('community_members')
        .select('*, user:user_id(id,username,avatar_url,is_online)')
        .eq('community_id', c.id),
      supabase.from('community_members').select('role').eq('community_id', c.id).eq('user_id', user.id).single(),
    ])
    setPosts(p ?? [])
    setMembers(mem ?? [])
    setMyRole(myMem?.role ?? null)

    if (myMem?.role === 'owner' || myMem?.role === 'moderator') {
      const { data: reqs } = await supabase.from('community_join_requests')
        .select('*, requester:user_id(id,username,avatar_url)')
        .eq('community_id', c.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      setJoinRequests(reqs ?? [])
    }
    setLoading(false)
  }

  async function submitPost() {
    if (!newPost.trim()) return
    setPosting(true)
    const { error } = await supabase.from('community_posts')
      .insert({ community_id: community.id, author_id: user.id, content: newPost.trim() })
    if (error) { toast.error(error.message); setPosting(false); return }
    setNewPost('')
    fetchAll()
    setPosting(false)
  }

  async function toggleLike(postId) {
    const { data: existing } = await supabase.from('community_post_likes')
      .select('id').eq('post_id', postId).eq('user_id', user.id).single()
    if (existing) {
      await supabase.from('community_post_likes').delete().eq('id', existing.id)
    } else {
      await supabase.from('community_post_likes').insert({ post_id: postId, user_id: user.id })
    }
    fetchAll()
  }

  async function loadComments(postId) {
    const { data } = await supabase.from('community_comments')
      .select('*, author:author_id(id,username,avatar_url)')
      .eq('post_id', postId).eq('is_deleted', false).order('created_at', { ascending: true })
    setComments(prev => ({ ...prev, [postId]: data ?? [] }))
    setExpandedComments(prev => new Set([...prev, postId]))
  }

  async function submitComment(postId) {
    const text = commentText[postId]?.trim()
    if (!text) return
    await supabase.from('community_comments').insert({ post_id: postId, author_id: user.id, content: text })
    setCommentText(prev => ({ ...prev, [postId]: '' }))
    loadComments(postId)
  }

  async function deletePost(postId) {
    await supabase.from('community_posts').update({ is_deleted: true }).eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  async function removeMember(memberId, userId) {
    if (!window.confirm('Remove this member?')) return
    await supabase.from('community_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
    toast.success('Member removed')
  }

  async function promoteMember(memberId) {
    await supabase.from('community_members').update({ role: 'moderator' }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'moderator' } : m))
    toast.success('Promoted to moderator')
  }

  async function reviewRequest(reqId, userId, approve) {
    if (approve) {
      await supabase.from('community_members').insert({ community_id: community.id, user_id: userId, role: 'member' })
    }
    await supabase.from('community_join_requests').update({
      status: approve ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', reqId)
    setJoinRequests(prev => prev.filter(r => r.id !== reqId))
    toast.success(approve ? 'Request approved' : 'Request rejected')
  }

  if (loading) return (
    <PageWrapper>
      <Skeleton className="h-40 mb-4" />
      <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
    </PageWrapper>
  )
  if (!community) return <PageWrapper><div className="text-center py-20 text-muted">Community not found</div></PageWrapper>

  const tabs = ['posts', 'members', ...(isOwnerOrMod ? ['requests'] : [])]

  return (
    <PageWrapper className="max-w-3xl">
      <Link to="/communities" className="text-sm text-muted hover:text-white transition-colors mb-4 inline-block">
        Back to Communities
      </Link>

      <Card className="p-5 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white">{community.name}</h1>
              {!community.is_public && <Badge color="gray">Private</Badge>}
              {community.is_verified && <Badge color="blue">Verified</Badge>}
            </div>
            {community.game_focus && <p className="text-xs text-primary/80 mb-1">{community.game_focus}</p>}
            {community.description && <p className="text-sm text-muted">{community.description}</p>}
            <p className="text-xs text-muted mt-2">
              {members.length} members · Created by {community.owner?.username}
            </p>
          </div>
          {myRole && <Badge color={myRole === 'owner' ? 'amber' : myRole === 'moderator' ? 'purple' : 'gray'}>{myRole}</Badge>}
        </div>
      </Card>

      <div className="flex gap-1 mb-6 border-b border-white/[0.08]">
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

      {tab === 'posts' && (
        <div className="space-y-4">
          {isMember && (
            <Card className="p-4">
              <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
                placeholder="Share something with the community..."
                rows={3} className="w-full bg-surface2 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary resize-none mb-3" />
              <div className="flex justify-end">
                <button onClick={submitPost} disabled={posting || !newPost.trim()}
                  className="bg-primary hover:bg-primary/80 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </Card>
          )}

          {!isMember && (
            <div className="text-center py-8 text-muted text-sm border border-white/[0.06] rounded-xl">
              {community.is_public ? 'Join this community to post and interact.' : 'This is a private community. Request to join to see posts.'}
            </div>
          )}

          {posts.length === 0 && isMember
            ? <div className="text-center py-16 text-muted">No posts yet. Be the first!</div>
            : posts.map(p => {
              const likeCount = p.likes?.[0]?.count ?? 0
              const commentCount = p.comments?.[0]?.count ?? 0
              const showComments = expandedComments.has(p.id)
              const isAuthor = p.author_id === user.id

              return (
                <Card key={p.id} className={`p-4 ${p.is_pinned ? 'border-primary/30 bg-primary/5' : ''}`}>
                  {p.is_pinned && <p className="text-xs text-primary font-semibold mb-2">Pinned</p>}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar user={p.author} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Link to={`/profile/${p.author?.username}`} className="text-sm font-semibold text-white hover:text-primary">{p.author?.username}</Link>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">{timeAgo(p.created_at)}</span>
                          {isAuthor && (
                            <button onClick={() => deletePost(p.id)} className="text-xs text-muted hover:text-red-400 transition-colors">Delete</button>
                          )}
                          {!isAuthor && <ReportButton targetType="post" targetId={p.id} />}
                        </div>
                      </div>
                      <p className="text-sm text-white/90 mt-1 whitespace-pre-wrap">{p.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-white/[0.06]">
                    <button onClick={() => toggleLike(p.id)} className="text-xs text-muted hover:text-red-400 transition-colors">
                      Like {likeCount > 0 && `(${likeCount})`}
                    </button>
                    <button
                      onClick={() => showComments
                        ? setExpandedComments(prev => { const s = new Set(prev); s.delete(p.id); return s })
                        : loadComments(p.id)}
                      className="text-xs text-muted hover:text-primary transition-colors">
                      {showComments ? 'Hide comments' : `Comments${commentCount > 0 ? ` (${commentCount})` : ''}`}
                    </button>
                  </div>

                  {showComments && (
                    <div className="mt-3 space-y-2 pl-3 border-l border-white/[0.06]">
                      {(comments[p.id] ?? []).map(c => (
                        <div key={c.id} className="flex items-start gap-2">
                          <Avatar user={c.author} size={24} />
                          <div className="bg-surface2 rounded-xl px-3 py-2 flex-1">
                            <p className="text-xs font-semibold text-white">{c.author?.username}</p>
                            <p className="text-xs text-white/80">{c.content}</p>
                          </div>
                        </div>
                      ))}
                      {isMember && (
                        <div className="flex gap-2 mt-2">
                          <input
                            value={commentText[p.id] ?? ''}
                            onChange={e => setCommentText(prev => ({ ...prev, [p.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && submitComment(p.id)}
                            placeholder="Write a comment..."
                            className="flex-1 bg-surface2 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary" />
                          <button onClick={() => submitComment(p.id)} className="text-xs text-primary hover:text-primary/80 font-semibold px-2">
                            Reply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
        </div>
      )}

      {tab === 'members' && (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-4">
                <div className="relative">
                  <Avatar user={m.user} size={36} />
                  {m.user?.is_online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-surface" />}
                </div>
                <div className="flex-1">
                  <Link to={`/profile/${m.user?.username}`} className="text-sm font-semibold text-white hover:text-primary">{m.user?.username}</Link>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.role === 'owner' ? 'bg-amber-500/20 text-amber-400' : m.role === 'moderator' ? 'bg-primary/20 text-primary' : 'bg-surface2 text-muted'}`}>
                  {m.role}
                </span>
                {myRole === 'owner' && m.role === 'member' && m.user?.id !== user.id && (
                  <div className="flex gap-1">
                    <button onClick={() => promoteMember(m.id)} className="text-xs text-muted hover:text-primary transition-colors px-2 py-1 rounded hover:bg-surface2">
                      Promote
                    </button>
                    <button onClick={() => removeMember(m.id, m.user?.id)} className="text-xs text-muted hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-surface2">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'requests' && isOwnerOrMod && (
        <div className="space-y-3">
          {joinRequests.length === 0
            ? <div className="text-center py-16 text-muted">No pending join requests</div>
            : joinRequests.map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar user={r.requester} size={40} />
                  <div className="flex-1">
                    <Link to={`/profile/${r.requester?.username}`} className="text-sm font-semibold text-white hover:text-primary">{r.requester?.username}</Link>
                    <p className="text-xs text-muted">{timeAgo(r.created_at)}</p>
                    {r.message && <p className="text-sm text-white/80 mt-1 bg-surface2 rounded-lg px-3 py-2">{r.message}</p>}
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
    </PageWrapper>
  )
}
