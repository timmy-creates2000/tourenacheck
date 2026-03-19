import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Textarea } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import toast from 'react-hot-toast'
import { Upload, Image as ImageIcon, Coins, Award, Plus, Edit2, Trash2, Send, Search } from 'lucide-react'
import { BADGES } from '../../lib/constants'

// ─── helpers ────────────────────────────────────────────────────────────────

function BadgeIcon({ icon, color, size = 48 }) {
  const s = size
  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: s, height: s, backgroundColor: `${color}20`, border: `2px solid ${color}` }}
    >
      {icon?.startsWith('http')
        ? <img src={icon} alt="" className="w-full h-full object-cover" />
        : <span style={{ fontSize: s * 0.45 }}>{icon || '?'}</span>}
    </div>
  )
}

function UploadLabel({ uploading, label, onChange, accept = 'image/*' }) {
  return (
    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-surface2 hover:bg-surface border border-white/10 rounded-lg text-sm text-white transition-colors">
      <input type="file" accept={accept} className="hidden" onChange={e => onChange(e.target.files[0])} />
      <Upload size={16} />
      {uploading ? 'Uploading…' : label}
    </label>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AdminPlatformAssets() {
  const [uploading, setUploading] = useState(null) // key of asset being uploaded
  const [assets, setAssets] = useState({ coinImage: '/coin.svg', platformLogo: '/tourena-icon.png', platformBanner: '/hero.png' })

  // badge overrides stored in platform_settings as badge_override_{type}
  const [badgeOverrides, setBadgeOverrides] = useState({}) // { type: { icon, color } }

  // custom badges (badge_custom_{id})
  const [customBadges, setCustomBadges] = useState([])

  // badge edit modal
  const [badgeModal, setBadgeModal] = useState(null) // { mode: 'system'|'custom', badge }
  const [badgeForm, setBadgeForm] = useState({ name: '', description: '', icon: '', iconType: 'emoji', color: '#FFD700', condition: '' })
  const [badgeUploading, setBadgeUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // send badge modal
  const [sendModal, setSendModal] = useState(null) // badge object
  const [playerSearch, setPlayerSearch] = useState('')
  const [playerResults, setPlayerResults] = useState([])
  const [sendLoading, setSendLoading] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    await Promise.all([fetchAssets(), fetchBadgeData()])
  }

  async function fetchAssets() {
    const { data } = await supabase.from('platform_settings').select('key,value')
      .in('key', ['asset_coinImage', 'asset_platformLogo', 'asset_platformBanner'])
    if (data) {
      const map = {}
      data.forEach(r => { map[r.key.replace('asset_', '')] = r.value })
      setAssets(prev => ({ ...prev, ...map }))
    }
  }

  async function fetchBadgeData() {
    const { data } = await supabase.from('platform_settings').select('*').or('key.like.badge_override_%,key.like.badge_custom_%')
    if (!data) return
    const overrides = {}
    const customs = []
    data.forEach(row => {
      try {
        const val = JSON.parse(row.value)
        if (row.key.startsWith('badge_override_')) {
          overrides[row.key.replace('badge_override_', '')] = val
        } else if (row.key.startsWith('badge_custom_')) {
          customs.push({ id: row.key, ...val })
        }
      } catch {}
    })
    setBadgeOverrides(overrides)
    setCustomBadges(customs)
  }

  async function handleUpload(type, file) {
    if (!file) return
    setUploading(type)
    try {
      const ext = file.name.split('.').pop()
      const path = `platform/${type}.${ext}`
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
      setAssets(prev => ({ ...prev, [type]: publicUrl }))
      await supabase.from('platform_settings').upsert({ key: `asset_${type}`, value: publicUrl, description: `Platform ${type}` }, { onConflict: 'key' })
      toast.success('Uploaded!')
    } catch (err) { toast.error(err.message) }
    finally { setUploading(null) }
  }

  async function handleBadgeImageUpload(file) {
    if (!file) return
    setBadgeUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `badges/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
      setBadgeForm(p => ({ ...p, icon: publicUrl }))
      toast.success('Image uploaded')
    } catch (err) { toast.error(err.message) }
    finally { setBadgeUploading(false) }
  }

  function openSystemBadgeEdit(badge) {
    const override = badgeOverrides[badge.type] ?? {}
    setBadgeForm({
      name: override.name ?? badge.name,
      description: override.description ?? badge.description,
      icon: override.icon ?? badge.icon,
      iconType: (override.icon ?? badge.icon)?.startsWith('http') ? 'image' : 'emoji',
      color: override.color ?? '#FFD700',
      condition: override.condition ?? badge.description,
    })
    setBadgeModal({ mode: 'system', badge })
  }

  function openCustomBadgeEdit(badge = null) {
    if (badge) {
      setBadgeForm({
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        iconType: badge.icon?.startsWith('http') ? 'image' : 'emoji',
        color: badge.color ?? '#FFD700',
        condition: badge.condition ?? '',
      })
      setBadgeModal({ mode: 'custom', badge })
    } else {
      setBadgeForm({ name: '', description: '', icon: '', iconType: 'emoji', color: '#FFD700', condition: '' })
      setBadgeModal({ mode: 'custom', badge: null })
    }
  }

  async function saveBadge() {
    if (!badgeForm.name || !badgeForm.icon) { toast.error('Name and icon are required'); return }
    setSaving(true)
    try {
      if (badgeModal.mode === 'system') {
        const key = `badge_override_${badgeModal.badge.type}`
        await supabase.from('platform_settings').upsert({ key, value: JSON.stringify(badgeForm), description: `Override for ${badgeModal.badge.type}` }, { onConflict: 'key' })
        toast.success('Badge updated!')
      } else {
        const id = badgeModal.badge?.id ?? `badge_custom_${Date.now()}`
        await supabase.from('platform_settings').upsert({ key: id, value: JSON.stringify(badgeForm), description: `Custom badge: ${badgeForm.name}` }, { onConflict: 'key' })
        toast.success(badgeModal.badge ? 'Badge updated!' : 'Badge created!')
      }
      setBadgeModal(null)
      fetchBadgeData()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function deleteCustomBadge(id) {
    if (!confirm('Delete this badge?')) return
    await supabase.from('platform_settings').delete().eq('key', id)
    toast.success('Deleted')
    fetchBadgeData()
  }

  async function resetSystemBadge(type) {
    if (!confirm('Reset this badge to default?')) return
    await supabase.from('platform_settings').delete().eq('key', `badge_override_${type}`)
    toast.success('Reset to default')
    fetchBadgeData()
  }

  // ── Send badge to player ──────────────────────────────────────────────────

  function openSendModal(badge) {
    setSendModal(badge)
    setPlayerSearch('')
    setPlayerResults([])
  }

  const searchPlayers = useCallback(async (q) => {
    if (!q.trim()) { setPlayerResults([]); return }
    const { data } = await supabase.from('users').select('id,username,avatar_url,email').or(`username.ilike.%${q}%,email.ilike.%${q}%`).limit(10)
    setPlayerResults(data ?? [])
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchPlayers(playerSearch), 300)
    return () => clearTimeout(t)
  }, [playerSearch, searchPlayers])

  async function sendBadgeToPlayer(player) {
    if (!sendModal) return
    setSendLoading(true)
    try {
      const badgeType = sendModal.type ?? sendModal.id
      const badgeName = sendModal.name
      await supabase.from('player_badges').upsert({
        user_id: player.id,
        badge_type: badgeType,
        badge_name: badgeName,
        badge_description: sendModal.description,
      }, { onConflict: 'user_id,badge_type', ignoreDuplicates: true })
      toast.success(`"${badgeName}" sent to ${player.username}`)
    } catch (err) { toast.error(err.message) }
    finally { setSendLoading(false) }
  }

  // ── Merge system badges with overrides ────────────────────────────────────

  const systemBadges = BADGES.map(b => {
    const ov = badgeOverrides[b.type] ?? {}
    return { ...b, ...ov, type: b.type, _original: b }
  })

  return (
    <PageWrapper>
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon className="text-primary" size={28} />
        <h1 className="text-2xl font-black text-white">Platform Assets</h1>
      </div>

      {/* ── Platform Images ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { key: 'coinImage',      label: 'Coin Image (TC)',    hint: '64×64px PNG',        preview: 'contain', icon: <Coins size={32} className="text-muted" /> },
          { key: 'platformLogo',   label: 'Platform Logo',      hint: '256×256px PNG',      preview: 'contain', icon: <ImageIcon size={32} className="text-muted" /> },
          { key: 'platformBanner', label: 'Hero Banner',        hint: '1920×1080px',        preview: 'cover',   icon: <ImageIcon size={32} className="text-muted" /> },
        ].map(({ key, label, hint, preview, icon }) => (
          <Card key={key} className="p-4">
            <p className="text-sm font-bold text-white mb-3">{label}</p>
            <div className={`w-full h-28 bg-surface2 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden mb-3 ${preview === 'cover' ? '' : 'p-3'}`}>
              {assets[key]
                ? <img src={assets[key]} alt={label} className={`w-full h-full object-${preview}`} />
                : icon}
            </div>
            <UploadLabel uploading={uploading === key} label="Replace Image" onChange={f => handleUpload(key, f)} />
            <p className="text-xs text-muted mt-1">{hint}</p>
          </Card>
        ))}
      </div>

      {/* ── System Badges ───────────────────────────────────────────────── */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Award className="text-accent" size={22} />
          <h2 className="text-lg font-bold text-white">System Badges</h2>
          <span className="text-xs text-muted ml-auto">Click edit to replace icon with your own image</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {systemBadges.map(b => {
            const hasOverride = !!badgeOverrides[b.type]
            return (
              <div key={b.type} className="flex items-center gap-3 p-3 bg-surface2 rounded-xl border border-white/[0.06] hover:border-white/20 transition-colors">
                <BadgeIcon icon={b.icon} color={b.color ?? '#FFD700'} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{b.name}</p>
                  <p className="text-xs text-muted truncate">{b.description}</p>
                  {hasOverride && <span className="text-[10px] text-primary">customised</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openSystemBadgeEdit(b._original)} className="p-1.5 rounded-lg bg-surface hover:bg-primary/20 text-muted hover:text-primary transition-colors" title="Edit">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => openSendModal(b)} className="p-1.5 rounded-lg bg-surface hover:bg-green-500/20 text-muted hover:text-green-400 transition-colors" title="Send to player">
                    <Send size={13} />
                  </button>
                  {hasOverride && (
                    <button onClick={() => resetSystemBadge(b.type)} className="p-1.5 rounded-lg bg-surface hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors" title="Reset to default">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Custom Badges ───────────────────────────────────────────────── */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Award className="text-primary" size={22} />
            <h2 className="text-lg font-bold text-white">Custom Badges</h2>
          </div>
          <Button size="sm" onClick={() => openCustomBadgeEdit()}>
            <Plus size={14} className="mr-1" /> New Badge
          </Button>
        </div>
        {customBadges.length === 0 ? (
          <p className="text-center py-8 text-muted text-sm">No custom badges yet. Create one to award to special players.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customBadges.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3 bg-surface2 rounded-xl border border-white/[0.06] hover:border-white/20 transition-colors">
                <BadgeIcon icon={b.icon} color={b.color ?? '#FFD700'} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{b.name}</p>
                  <p className="text-xs text-muted truncate">{b.description}</p>
                  {b.condition && <p className="text-[10px] text-accent truncate">{b.condition}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openCustomBadgeEdit(b)} className="p-1.5 rounded-lg bg-surface hover:bg-primary/20 text-muted hover:text-primary transition-colors" title="Edit">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => openSendModal(b)} className="p-1.5 rounded-lg bg-surface hover:bg-green-500/20 text-muted hover:text-green-400 transition-colors" title="Send to player">
                    <Send size={13} />
                  </button>
                  <button onClick={() => deleteCustomBadge(b.id)} className="p-1.5 rounded-lg bg-surface hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Badge Edit Modal ─────────────────────────────────────────────── */}
      <Modal open={!!badgeModal} onClose={() => setBadgeModal(null)}
        title={badgeModal?.mode === 'system' ? `Edit: ${badgeModal?.badge?.name}` : (badgeModal?.badge ? 'Edit Custom Badge' : 'New Custom Badge')}>
        <div className="space-y-4">
          {badgeModal?.mode === 'custom' && (
            <Input label="Badge Name" placeholder="e.g. 1 Win Wonder, Elite Sniper"
              value={badgeForm.name} onChange={e => setBadgeForm(p => ({ ...p, name: e.target.value }))} />
          )}

          <Textarea label="Description" placeholder="What this badge represents…"
            value={badgeForm.description} onChange={e => setBadgeForm(p => ({ ...p, description: e.target.value }))} rows={2} />

          {badgeModal?.mode === 'custom' && (
            <Input label="Condition / Trigger (optional)" placeholder="e.g. After 1 win, Special award, Top 3 finish"
              value={badgeForm.condition} onChange={e => setBadgeForm(p => ({ ...p, condition: e.target.value }))} />
          )}

          {/* Icon type */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Icon</label>
            <div className="flex gap-2 mb-3">
              {['emoji', 'image'].map(t => (
                <button key={t} onClick={() => setBadgeForm(p => ({ ...p, iconType: t, icon: '' }))}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${badgeForm.iconType === t ? 'bg-primary text-white' : 'bg-surface2 text-muted hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </div>
            {badgeForm.iconType === 'emoji' ? (
              <Input placeholder="🏆 paste any emoji" value={badgeForm.icon} onChange={e => setBadgeForm(p => ({ ...p, icon: e.target.value }))} />
            ) : (
              <div className="flex items-center gap-3">
                <UploadLabel uploading={badgeUploading} label="Upload Image" onChange={handleBadgeImageUpload} />
                {badgeForm.icon && <img src={badgeForm.icon} alt="" className="w-10 h-10 rounded-full object-cover border border-white/20" />}
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Border Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={badgeForm.color} onChange={e => setBadgeForm(p => ({ ...p, color: e.target.value }))} className="w-12 h-9 rounded cursor-pointer" />
              <Input value={badgeForm.color} onChange={e => setBadgeForm(p => ({ ...p, color: e.target.value }))} placeholder="#FFD700" className="flex-1" />
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-surface2 rounded-xl">
            <BadgeIcon icon={badgeForm.icon} color={badgeForm.color} size={48} />
            <div>
              <p className="text-white font-bold">{badgeForm.name || (badgeModal?.badge?.name ?? 'Badge Name')}</p>
              <p className="text-xs text-muted">{badgeForm.description || 'Description'}</p>
              {badgeForm.condition && <p className="text-xs text-accent">{badgeForm.condition}</p>}
            </div>
          </div>

          <Button className="w-full" loading={saving} onClick={saveBadge}>Save Badge</Button>
        </div>
      </Modal>

      {/* ── Send Badge Modal ─────────────────────────────────────────────── */}
      <Modal open={!!sendModal} onClose={() => setSendModal(null)} title={`Send "${sendModal?.name}" to Player`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-surface2 rounded-xl">
            <BadgeIcon icon={sendModal?.icon} color={sendModal?.color ?? '#FFD700'} size={44} />
            <div>
              <p className="text-white font-bold">{sendModal?.name}</p>
              <p className="text-xs text-muted">{sendModal?.description}</p>
            </div>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={playerSearch} onChange={e => setPlayerSearch(e.target.value)}
              placeholder="Search player by username or email…"
              className="w-full bg-surface2 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
          </div>

          {playerResults.length > 0 && (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {playerResults.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-surface2 rounded-lg hover:bg-surface transition-colors">
                  <Avatar user={p} size={32} showName />
                  <Button size="sm" loading={sendLoading} onClick={() => sendBadgeToPlayer(p)}>Send</Button>
                </div>
              ))}
            </div>
          )}
          {playerSearch && playerResults.length === 0 && (
            <p className="text-center text-sm text-muted py-4">No players found</p>
          )}
        </div>
      </Modal>
    </PageWrapper>
  )
}
