import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Search, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { timeAgo } from '../../lib/utils'
import toast from 'react-hot-toast'

function Avatar({ user, size = 36 }) {
  const s = `${size}px`
  if (user?.avatar_url)
    return <img src={user.avatar_url} style={{ width: s, height: s }} className="rounded-full object-cover flex-shrink-0 border border-white/10" alt="" />
  return (
    <div style={{ width: s, height: s }} className="rounded-full bg-primary/30 border border-primary/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
      {(user?.username ?? '?').slice(0, 2).toUpperCase()}
    </div>
  )
}

export default function Messages() {
  const { user, profile } = useAuth()
  const [convos, setConvos] = useState([])
  const [active, setActive] = useState(null) // conversation object
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  const loadConvos = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('conversations')
      .select('*, participant_a_user:participant_a(id,username,avatar_url,is_online,last_seen), participant_b_user:participant_b(id,username,avatar_url,is_online,last_seen)')
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
    setConvos(data ?? [])
    setLoadingConvos(false)
  }, [user])

  useEffect(() => { loadConvos() }, [loadConvos])

  async function openConvo(convo) {
    setActive(convo)
    setLoadingMsgs(true)
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data ?? [])
    setLoadingMsgs(false)

    // subscribe to new messages
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase.channel(`dm:${convo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${convo.id}` },
        (p) => setMessages(prev => [...prev, p.new]))
      .subscribe()
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }, [])

  async function searchUsers(q) {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase.from('users')
      .select('id, username, avatar_url')
      .ilike('username', `%${q}%`)
      .neq('id', user.id)
      .eq('account_status', 'approved')
      .limit(8)
    setSearchResults(data ?? [])
    setSearching(false)
  }

  async function startConvo(otherUser) {
    // find or create conversation
    const a = user.id < otherUser.id ? user.id : otherUser.id
    const b = user.id < otherUser.id ? otherUser.id : user.id
    let { data: existing } = await supabase.from('conversations')
      .select('*')
      .eq('participant_a', a).eq('participant_b', b).single()
    if (!existing) {
      const { data: created } = await supabase.from('conversations')
        .insert({ participant_a: a, participant_b: b }).select().single()
      existing = created
    }
    setSearch('')
    setSearchResults([])
    await loadConvos()
    // attach user objects
    const enriched = {
      ...existing,
      participant_a_user: a === user.id ? profile : otherUser,
      participant_b_user: b === user.id ? profile : otherUser,
    }
    openConvo(enriched)
  }

  async function sendMessage() {
    if (!text.trim() || !active) return
    const content = text.trim()
    setText('')
    const { error } = await supabase.from('direct_messages').insert({
      conversation_id: active.id,
      sender_id: user.id,
      content,
    })
    if (error) { toast.error(error.message); return }
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
  }

  function getOther(convo) {
    return convo.participant_a === user?.id ? convo.participant_b_user : convo.participant_a_user
  }

  return (
    <PageWrapper className="max-w-5xl">
      <h1 className="text-3xl font-black text-white mb-6">💬 Messages</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
        {/* Sidebar */}
        <Card className={`flex flex-col overflow-hidden ${active ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => { setSearch(e.target.value); searchUsers(e.target.value) }}
                placeholder="Find a user..."
                className="w-full bg-surface2 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 bg-surface border border-white/10 rounded-xl overflow-hidden shadow-xl">
                {searchResults.map(u => (
                  <button key={u.id} onClick={() => startConvo(u)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface2 transition-colors text-left">
                    <Avatar user={u} size={28} />
                    <span className="text-sm text-white">{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
            {loadingConvos ? Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-16" /></div>
              </div>
            )) : convos.length === 0 ? (
              <div className="text-center py-10 text-muted text-sm">No conversations yet.<br />Search for a user above.</div>
            ) : convos.map(c => {
              const other = getOther(c)
              const isActive = active?.id === c.id
              return (
                <button key={c.id} onClick={() => openConvo(c)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-surface2 transition-colors text-left ${isActive ? 'bg-primary/10' : ''}`}>
                  <div className="relative">
                    <Avatar user={other} size={36} />
                    {other?.is_online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-surface" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{other?.username}</p>
                    <p className="text-xs text-muted">{c.last_message_at ? timeAgo(c.last_message_at) : 'No messages yet'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Chat panel */}
        <div className={`md:col-span-2 flex flex-col ${!active ? 'hidden md:flex' : 'flex'}`}>
          {!active ? (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted">
                <div className="text-5xl mb-3">💬</div>
                <p className="text-sm">Select a conversation or search for a user</p>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
                <button className="md:hidden text-muted hover:text-white mr-1" onClick={() => setActive(null)}>
                  <ArrowLeft size={18} />
                </button>
                <Avatar user={getOther(active)} size={36} />
                <div>
                  <p className="text-sm font-bold text-white">{getOther(active)?.username}</p>
                  <p className="text-xs text-muted">{getOther(active)?.is_online ? '🟢 Online' : 'Offline'}</p>
                </div>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                  : messages.map(m => {
                    const isMe = m.sender_id === user.id
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-surface2 text-white rounded-bl-sm'}`}>
                          <p>{m.content}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-muted'}`}>{timeAgo(m.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                <div ref={bottomRef} />
              </div>
              {/* Input */}
              <div className="p-3 border-t border-white/[0.06] flex gap-2">
                <input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-surface2 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary" />
                <button onClick={sendMessage} disabled={!text.trim()}
                  className="bg-primary hover:bg-primary/80 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
