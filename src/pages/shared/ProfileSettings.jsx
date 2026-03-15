import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Textarea, Select } from '../../components/ui/Input'
import { COUNTRIES, CURRENCY_RATES } from '../../lib/constants'
import toast from 'react-hot-toast'

export default function ProfileSettings() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [form, setForm] = useState({ username: '', display_name: '', bio: '', country: '', preferred_currency: 'NGN', social_youtube: '', social_twitter: '', social_twitch: '', gender: '', favourite_game: '' })
  const [gameTags, setGameTags] = useState([])
  const [newTag, setNewTag] = useState({ game_name: '', game_tag: '' })
  const [addingTag, setAddingTag] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  useEffect(() => {
    if (profile) {
      setForm({ username: profile.username ?? '', display_name: profile.display_name ?? '', bio: profile.bio ?? '', country: profile.country ?? '', preferred_currency: profile.preferred_currency ?? 'NGN', social_youtube: profile.social_youtube ?? '', social_twitter: profile.social_twitter ?? '', social_twitch: profile.social_twitch ?? '', gender: profile.gender ?? '', favourite_game: profile.favourite_game ?? '' })
      fetchGameTags()
    }
  }, [profile])

  async function fetchGameTags() {
    const { data } = await supabase.from('game_tags').select('*').eq('user_id', profile.id)
    setGameTags(data ?? [])
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function saveProfile() {
    setSaving(true)
    try {
      let avatar_url = profile.avatar_url
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `avatars/${profile.id}.${ext}`
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = publicUrl
      }
      const { error } = await supabase.from('users').update({ ...form, avatar_url }).eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function addGameTag() {
    if (!newTag.game_name || !newTag.game_tag) return
    const { error } = await supabase.from('game_tags').insert({ user_id: profile.id, ...newTag })
    if (error) { toast.error(error.message); return }
    setNewTag({ game_name: '', game_tag: '' })
    setAddingTag(false)
    fetchGameTags()
    toast.success('Game tag added!')
  }

  async function deleteGameTag(id) {
    await supabase.from('game_tags').delete().eq('id', id)
    fetchGameTags()
  }

  async function changePassword() {
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    if (error) { toast.error(error.message); return }
    toast.success('Password updated!')
    setPwForm({ current: '', newPw: '', confirm: '' })
  }

  async function switchRole() {
    // Organizers can switch to player, players CANNOT switch to organizer
    if (profile.role === 'player') {
      toast.error('Players cannot switch to organizer. Contact admin for organizer access.')
      return
    }
    const newRole = 'player' // organizer → player only
    await supabase.from('users').update({ role: newRole }).eq('id', profile.id)
    await refreshProfile()
    toast.success(`Switched to ${newRole}!`)
  }

  async function deleteAccount() {
    if (!confirm('This will permanently delete your account and forfeit any remaining TC balance. Are you sure?')) return
    await supabase.from('users').delete().eq('id', profile.id)
    await signOut()
  }

  return (
    <PageWrapper className="max-w-2xl">
      <h1 className="text-3xl font-black text-white mb-8">⚙️ Settings</h1>

      {/* Avatar & Identity */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">Avatar & Identity</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {(avatarPreview || profile?.avatar_url)
              ? <img src={avatarPreview || profile.avatar_url} className="w-20 h-20 rounded-full object-cover border-2 border-primary/50" alt="avatar" />
              : <div className="w-20 h-20 rounded-full bg-primary/30 border-2 border-primary/50 flex items-center justify-center text-2xl font-black text-white">{profile?.username?.slice(0,2).toUpperCase()}</div>
            }
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-500 transition-colors">
              <Edit2 size={12} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div className="text-sm text-muted">Click the edit icon to upload a new avatar</div>
        </div>
        <div className="space-y-4">
          <Input label="Username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
          <Input label="Display Name (optional)" value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} />
          <div className="space-y-1">
            <Textarea label="Bio" value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} maxLength={150} rows={3} placeholder="Tell the arena about yourself..." />
            <p className="text-xs text-muted text-right">{form.bio.length}/150</p>
          </div>
          <Select label="Country" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}>
            <option value="">Select country</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </Select>
          <Select label="Gender" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non_binary">Non-binary</option>
          </Select>
          <Input label="Favourite Game" placeholder="e.g. FIFA 25, Valorant..." value={form.favourite_game} onChange={e => setForm(p => ({ ...p, favourite_game: e.target.value }))} />
        </div>
      </Card>

      {/* Game Tags */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Game Tags</h2>
          <Button size="sm" variant="secondary" onClick={() => setAddingTag(true)}><Plus size={14} className="mr-1" />Add Tag</Button>
        </div>
        <div className="space-y-2">
          {gameTags.map(gt => (
            <div key={gt.id} className="flex items-center justify-between bg-surface2 rounded-lg px-4 py-2.5">
              <div className="text-sm"><span className="text-white font-semibold">{gt.game_name}</span><span className="text-muted ml-2">#{gt.game_tag}</span></div>
              <button onClick={() => deleteGameTag(gt.id)} className="text-muted hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
            </div>
          ))}
          {addingTag && (
            <div className="flex gap-2 items-end">
              <Input placeholder="Game Name" value={newTag.game_name} onChange={e => setNewTag(p => ({ ...p, game_name: e.target.value }))} className="flex-1" />
              <Input placeholder="Game Tag" value={newTag.game_tag} onChange={e => setNewTag(p => ({ ...p, game_tag: e.target.value }))} className="flex-1" />
              <Button size="sm" onClick={addGameTag}><Check size={14} /></Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingTag(false)}><X size={14} /></Button>
            </div>
          )}
        </div>
      </Card>

      {/* Social Links */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">Social Links</h2>
        <div className="space-y-4">
          <Input label="YouTube URL" placeholder="https://youtube.com/@..." value={form.social_youtube} onChange={e => setForm(p => ({ ...p, social_youtube: e.target.value }))} />
          <Input label="Twitter/X URL" placeholder="https://twitter.com/..." value={form.social_twitter} onChange={e => setForm(p => ({ ...p, social_twitter: e.target.value }))} />
          <Input label="Twitch URL" placeholder="https://twitch.tv/..." value={form.social_twitch} onChange={e => setForm(p => ({ ...p, social_twitch: e.target.value }))} />
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">Preferences</h2>
        <div className="space-y-4">
          <Select label="Preferred Currency" value={form.preferred_currency} onChange={e => setForm(p => ({ ...p, preferred_currency: e.target.value }))}>
            {Object.entries(CURRENCY_RATES).map(([k, v]) => <option key={k} value={k}>{k} — {v.label}</option>)}
          </Select>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Current Role: <span className="text-accent capitalize">{profile?.role}</span></p>
              <p className="text-xs text-muted">{profile?.role === 'organizer' ? 'Switch to Player mode' : 'Contact admin for organizer access'}</p>
            </div>
            {profile?.role === 'organizer' && (
              <Button variant="secondary" size="sm" onClick={switchRole}>Switch to Player</Button>
            )}
          </div>
        </div>
      </Card>

      <Button onClick={saveProfile} loading={saving} className="w-full mb-6" size="lg">Save Changes</Button>

      {/* Security */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">Security</h2>
        <div className="space-y-4">
          <Input label="New Password" type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} />
          <Input label="Confirm New Password" type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          <Button variant="secondary" onClick={changePassword}>Update Password</Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-500/20">
        <h2 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-muted mb-4">This will permanently delete your account and forfeit any remaining TC balance.</p>
        <Button variant="danger" onClick={deleteAccount}>Delete Account</Button>
      </Card>
    </PageWrapper>
  )
}
