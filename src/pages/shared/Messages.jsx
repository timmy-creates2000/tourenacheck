import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Search, ArrowLeft, Check, CheckCheck, Smile, Reply, Edit2, Paperclip, X, Download } from 'lucide-react'
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
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState({})
  const [text, setText] = useState('')
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [replyTo, setReplyTo] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)
  const convoChannelRef = useRef(null)
  const activeRef = useRef(null)
  const fileInputRef = useRef(null)
  activeRef.current = active

  const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏']

  const loadConvos = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_a_user:participant_a(id,username,avatar_url,is_online,last_seen),
        participant_b_user:participant_b(id,username,avatar_url,is_online,last_seen)
      `)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
    if (error) console.error('loadConvos error:', error)
    setConvos(data ?? [])
    setLoadingConvos(false)
  }, [user])

  useEffect(() => { loadConvos() }, [loadConvos])

  // Real-time: refresh convo list when any conversation we're in gets updated
  useEffect(() => {
    if (!user) return
    if (convoChannelRef.current) supabase.removeChannel(convoChannelRef.current)
    convoChannelRef.current = supabase
      .channel(`convos:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConvos())
      .subscribe()
    return () => { if (convoChannelRef.current) supabase.removeChannel(convoChannelRef.current) }
  }, [user, loadConvos])

  // Cleanup DM channel on unmount
  useEffect(() => () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }, [])

  async function openConvo(convo) {
    setActive(convo)
    setLoadingMsgs(true)
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: true })
      .limit(100)
    if (error) console.error('openConvo error:', error)
    setMessages(data ?? [])
    setLoadingMsgs(false)

    // Load reactions
    if (data && data.length > 0) {
      const { data: reactionsData } = await supabase
        .from('message_reactions')
        .select('*, user:user_id(username)')
        .in('message_id', data.map(m => m.id))
      
      const grouped = {}
      reactionsData?.forEach(r => {
        if (!grouped[r.message_id]) grouped[r.message_id] = []
        grouped[r.message_id].push(r)
      })
      setReactions(grouped)
    }

    // Mark unread messages as read
    markRead(convo.id)

    // Subscribe to new messages in this conversation
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`dm:${convo.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `conversation_id=eq.${convo.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        // Auto-mark as read if this convo is still active
        if (activeRef.current?.id === convo.id && payload.new.sender_id !== user.id) {
          markRead(convo.id)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'direct_messages',
        filter: `conversation_id=eq.${convo.id}`
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'message_reactions'
      }, () => {
        loadReactions(convo.id)
      })
      .subscribe()
  }

  async function markRead(convoId) {
    if (!user) return
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', convoId)
      .neq('sender_id', user.id)
      .eq('is_read', false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function searchUsers(q) {
    if (!q.trim()) { setSearchResults([]); return }
    const { data } = await supabase.from('users')
      .select('id, username, avatar_url')
      .ilike('username', `%${q}%`)
      .neq('id', user.id)
      .eq('account_status', 'approved')
      .limit(8)
    setSearchResults(data ?? [])
  }

  async function startConvo(otherUser) {
    const a = user.id < otherUser.id ? user.id : otherUser.id
    const b = user.id < otherUser.id ? otherUser.id : user.id

    let { data: existing } = await supabase.from('conversations')
      .select('*')
      .eq('participant_a', a).eq('participant_b', b).maybeSingle()

    if (!existing) {
      const { data: created, error: createErr } = await supabase
        .from('conversations')
        .insert({ participant_a: a, participant_b: b })
        .select().single()
      if (createErr) { toast.error('Could not start conversation: ' + createErr.message); return }
      existing = created
    }

    if (!existing?.id) { toast.error('Could not start conversation'); return }

    setSearch('')
    setSearchResults([])
    await loadConvos()
    openConvo({
      ...existing,
      participant_a_user: a === user.id ? profile : otherUser,
      participant_b_user: b === user.id ? profile : otherUser,
    })
  }

  async function sendMessage() {
    if (!text.trim() || !active?.id || sending) return
    const content = text.trim()
    setText('')
    setSending(true)
    const { error } = await supabase.from('direct_messages').insert({
      conversation_id: active.id,
      sender_id: user.id,
      content,
      reply_to_id: replyTo?.id || null,
    })
    if (error) {
      toast.error('Failed to send: ' + error.message)
      setText(content)
      setSending(false)
      return
    }
    await supabase.from('conversations')
      .update({ last_message_at: new Date().toISOString(), last_message: content })
      .eq('id', active.id)
    setReplyTo(null)
    setSending(false)
  }

  async function toggleReaction(messageId, emoji) {
    const msgReactions = reactions[messageId] || []
    const existing = msgReactions.find(r => r.emoji === emoji && r.user_id === user.id)
    
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })
    }
    loadReactions(active.id)
    setShowEmojiPicker(null)
  }

  async function loadReactions(convoId) {
    const { data } = await supabase
      .from('message_reactions')
      .select('*, user:user_id(username)')
      .in('message_id', messages.map(m => m.id))
    
    const grouped = {}
    data?.forEach(r => {
      if (!grouped[r.message_id]) grouped[r.message_id] = []
      grouped[r.message_id].push(r)
    })
    setReactions(grouped)
  }

  async function startEdit(msg) {
    setEditingMsg(msg)
    setEditText(msg.content)
  }

  async function saveEdit() {
    if (!editText.trim() || !editingMsg) return
    const { error } = await supabase
      .from('direct_messages')
      .update({ content: editText.trim(), edited_at: new Date().toISOString() })
      .eq('id', editingMsg.id)
    
    if (error) {
      toast.error('Failed to edit')
      return
    }
    setMessages(prev => prev.map(m => 
      m.id === editingMsg.id ? { ...m, content: editText.trim(), edited_at: new Date().toISOString() } : m
    ))
    setEditingMsg(null)
    setEditText('')
  }

  async function uploadFile(file) {
    if (!file || !active?.id) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${ext}`
    
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file)
    
    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName)

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext.toLowerCase())
    
    const { error } = await supabase.from('direct_messages').insert({
      conversation_id: active.id,
      sender_id: user.id,
      content: file.name,
      attachment_url: publicUrl,
      attachment_type: isImage ? 'image' : 'file',
      reply_to_id: replyTo?.id || null,
    })

    if (error) {
      toast.error('Failed to send')
    } else {
      await supabase.from('conversations')
        .update({ last_message_at: new Date().toISOString(), last_message: `📎 ${file.name}` })
        .eq('id', active.id)
      setReplyTo(null)
    }
    
    setUploading(false)
  }

  function getOther(convo) {
    if (!convo || !user) return null
    return convo.participant_a === user.id ? convo.participant_b_user : convo.participant_a_user
  }

  function getUnreadCount(convo) {
    // We don't have per-convo unread counts loaded, but we can show a dot if last_message_at is recent
    // and the last message wasn't from us — this is a lightweight indicator
    return convo.last_unread_count ?? 0
  }

  return (
    <PageWrapper className="max-w-5xl">
      <h1 className="text-3xl font-black text-white mb-6">Messages</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-12rem)] md:h-[70vh]">

        {/* Sidebar */}
        <Card className={`flex flex-col overflow-hidden ${active ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); searchUsers(e.target.value) }}
                placeholder="Find a user..."
                className="w-full bg-surface2 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 bg-surface border border-white/10 rounded-xl overflow-hidden shadow-xl z-10 relative">
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
            {loadingConvos
              ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-32" />
                  </div>
                </div>
              ))
              : convos.length === 0
                ? <div className="text-center py-10 text-muted text-sm">No conversations yet.<br />Search for a user above.</div>
                : convos.map(c => {
                  const other = getOther(c)
                  const isActive = active?.id === c.id
                  return (
                    <button key={c.id} onClick={() => openConvo(c)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-surface2 transition-colors text-left ${isActive ? 'bg-primary/10' : ''}`}>
                      <div className="relative flex-shrink-0">
                        <Avatar user={other} size={38} />
                        {other?.is_online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-surface" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{other?.username ?? 'Unknown'}</p>
                        <p className="text-xs text-muted truncate">
                          {c.last_message
                            ? c.last_message.length > 30 ? c.last_message.slice(0, 30) + '…' : c.last_message
                            : c.last_message_at ? timeAgo(c.last_message_at) : 'No messages yet'}
                        </p>
                      </div>
                      {c.last_message_at && (
                        <span className="text-[10px] text-muted flex-shrink-0">{timeAgo(c.last_message_at)}</span>
                      )}
                    </button>
                  )
                })
            }
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
                <div className="relative">
                  <Avatar user={getOther(active)} size={36} />
                  {getOther(active)?.is_online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-surface" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{getOther(active)?.username}</p>
                  <p className="text-xs text-muted">{getOther(active)?.is_online ? 'Online' : 'Offline'}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingMsgs
                  ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                  : messages.length === 0
                    ? <div className="text-center py-12 text-muted text-sm">No messages yet. Say hi!</div>
                    : messages.map((m, i) => {
                      const isMe = m.sender_id === user.id
                      const showTime = i === 0 || (new Date(m.created_at) - new Date(messages[i - 1].created_at)) > 5 * 60 * 1000
                      const msgReactions = reactions[m.id] || []
                      const replyToMsg = m.reply_to_id ? messages.find(msg => msg.id === m.reply_to_id) : null
                      
                      return (
                        <div key={m.id}>
                          {showTime && (
                            <div className="text-center text-[10px] text-muted my-2">{timeAgo(m.created_at)}</div>
                          )}
                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                            <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                              {/* Reply preview */}
                              {replyToMsg && (
                                <div className="text-[10px] text-muted px-3 py-1 bg-surface2/50 rounded-lg border-l-2 border-primary/50">
                                  Replying to: {replyToMsg.content?.slice(0, 50)}...
                                </div>
                              )}
                              
                              <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-surface2 text-white rounded-bl-sm'}`}>
                                {m.is_deleted ? (
                                  <p className="italic text-white/40">Message deleted</p>
                                ) : m.attachment_url ? (
                                  <div>
                                    {m.attachment_type === 'image' ? (
                                      <img src={m.attachment_url} alt={m.content} className="max-w-full rounded-lg mb-1" />
                                    ) : (
                                      <a href={m.attachment_url} target="_blank" rel="noreferrer" 
                                        className="flex items-center gap-2 text-accent hover:underline">
                                        <Download size={14} />
                                        {m.content}
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <p className="break-words">{m.content}</p>
                                )}
                                {m.edited_at && (
                                  <span className="text-[9px] opacity-60 ml-1">(edited)</span>
                                )}
                                {isMe && !m.attachment_url && (
                                  <div className="flex justify-end mt-0.5">
                                    {m.is_read
                                      ? <CheckCheck size={11} className="text-accent" />
                                      : <Check size={11} className="text-white/40" />
                                    }
                                  </div>
                                )}
                              </div>

                              {/* Reactions */}
                              {msgReactions.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(
                                    msgReactions.reduce((acc, r) => {
                                      acc[r.emoji] = acc[r.emoji] || []
                                      acc[r.emoji].push(r)
                                      return acc
                                    }, {})
                                  ).map(([emoji, reacts]) => {
                                    const iReacted = reacts.some(r => r.user_id === user.id)
                                    return (
                                      <button
                                        key={emoji}
                                        onClick={() => toggleReaction(m.id, emoji)}
                                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                          iReacted ? 'bg-primary/30 border border-primary' : 'bg-surface2 border border-white/10'
                                        }`}
                                        title={reacts.map(r => r.user?.username).join(', ')}
                                      >
                                        {emoji} {reacts.length}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Action buttons (show on hover) */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button
                                  onClick={() => setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id)}
                                  className="text-[10px] text-muted hover:text-white px-2 py-1 rounded hover:bg-surface2"
                                  title="React"
                                >
                                  <Smile size={12} />
                                </button>
                                <button
                                  onClick={() => setReplyTo(m)}
                                  className="text-[10px] text-muted hover:text-white px-2 py-1 rounded hover:bg-surface2"
                                  title="Reply"
                                >
                                  <Reply size={12} />
                                </button>
                                {isMe && !m.attachment_url && (
                                  <button
                                    onClick={() => startEdit(m)}
                                    className="text-[10px] text-muted hover:text-white px-2 py-1 rounded hover:bg-surface2"
                                    title="Edit"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                )}
                              </div>

                              {/* Emoji picker */}
                              {showEmojiPicker === m.id && (
                                <div className="flex gap-1 bg-surface border border-white/10 rounded-lg p-2 shadow-xl">
                                  {QUICK_EMOJIS.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleReaction(m.id, emoji)}
                                      className="text-lg hover:scale-125 transition-transform"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                }
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/[0.06]">
                {/* Reply preview */}
                {replyTo && (
                  <div className="px-3 pt-2 flex items-center justify-between bg-surface2/50">
                    <div className="text-xs text-muted">
                      <Reply size={10} className="inline mr-1" />
                      Replying to: {replyTo.content?.slice(0, 50)}...
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-muted hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Edit mode */}
                {editingMsg ? (
                  <div className="p-3 flex gap-2">
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) saveEdit()
                        if (e.key === 'Escape') { setEditingMsg(null); setEditText('') }
                      }}
                      placeholder="Edit message..."
                      className="flex-1 bg-surface2 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                    <button onClick={saveEdit} className="bg-primary hover:bg-primary/80 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
                      Save
                    </button>
                    <button onClick={() => { setEditingMsg(null); setEditText('') }} className="bg-surface2 hover:bg-surface text-white px-4 py-2.5 rounded-xl text-sm">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="p-3 flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-muted hover:text-white p-2.5 rounded-xl hover:bg-surface2 transition-colors"
                      title="Attach file"
                    >
                      {uploading ? (
                        <div className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Paperclip size={16} />
                      )}
                    </button>
                    <input
                      value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Type a message..."
                      maxLength={2000}
                      className="flex-1 bg-surface2 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!text.trim() || sending}
                      className="bg-primary hover:bg-primary/80 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors flex-shrink-0"
                    >
                      {sending
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send size={16} />
                      }
                    </button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
