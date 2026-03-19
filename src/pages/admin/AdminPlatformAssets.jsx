import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Textarea } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { Upload, Image as ImageIcon, Coins, Award, Plus, Edit2, Trash2 } from 'lucide-react'

export default function AdminPlatformAssets() {
  const [uploading, setUploading] = useState(false)
  const [assets, setAssets] = useState({
    coinImage: '/coin.svg',
    platformLogo: '/tourena-icon.png',
    platformBanner: '/hero.png'
  })
  const [badges, setBadges] = useState([])
  const [badgeModal, setBadgeModal] = useState(false)
  const [editingBadge, setEditingBadge] = useState(null)
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    description: '',
    icon: '',
    iconType: 'emoji', // 'emoji' | 'image'
    color: '#FFD700'
  })
  const [badgeUploading, setBadgeUploading] = useState(false)

  useEffect(() => {
    fetchBadges()
    fetchAssets()
  }, [])

  async function fetchAssets() {
    const { data } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['asset_coinImage', 'asset_platformLogo', 'asset_platformBanner'])
    if (data) {
      const map = {}
      data.forEach(r => { map[r.key.replace('asset_', '')] = r.value })
      setAssets(prev => ({ ...prev, ...map }))
    }
  }

  async function fetchBadges() {
    // Get custom badges from platform_settings
    const { data } = await supabase
      .from('platform_settings')
      .select('*')
      .like('key', 'badge_%')
    
    if (data) {
      const badgeList = data.map(item => ({
        id: item.key,
        ...JSON.parse(item.value)
      }))
      setBadges(badgeList)
    }
  }

  async function handleUpload(type, file) {
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${type}.${ext}`
      const path = `platform/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(path)

      setAssets(prev => ({ ...prev, [type]: publicUrl }))

      await supabase
        .from('platform_settings')
        .upsert({
          key: `asset_${type}`,
          value: publicUrl,
          description: `Platform ${type} image URL`
        }, { onConflict: 'key' })

      toast.success(`${type} uploaded successfully!`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function saveBadge() {
    if (!badgeForm.name || !badgeForm.icon) {
      toast.error('Name and icon are required')
      return
    }

    try {
      const badgeId = editingBadge?.id || `badge_${Date.now()}`
      
      await supabase
        .from('platform_settings')
        .upsert({
          key: badgeId,
          value: JSON.stringify(badgeForm),
          description: `Custom badge: ${badgeForm.name}`
        }, { onConflict: 'key' })

      toast.success(editingBadge ? 'Badge updated!' : 'Badge created!')
      setBadgeModal(false)
      setEditingBadge(null)
      setBadgeForm({ name: '', description: '', icon: '', color: '#FFD700' })
      fetchBadges()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function deleteBadge(badgeId) {
    if (!confirm('Delete this badge? Users who have it will keep it, but it won\'t be awarded to new users.')) return
    
    try {
      await supabase
        .from('platform_settings')
        .delete()
        .eq('key', badgeId)
      
      toast.success('Badge deleted')
      fetchBadges()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function openBadgeModal(badge = null) {
    if (badge) {
      setEditingBadge(badge)
      setBadgeForm({
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        iconType: badge.icon?.startsWith('http') ? 'image' : 'emoji',
        color: badge.color
      })
    } else {
      setEditingBadge(null)
      setBadgeForm({ name: '', description: '', icon: '', iconType: 'emoji', color: '#FFD700' })
    }
    setBadgeModal(true)
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
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBadgeUploading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="flex items-center gap-3 mb-8">
        <ImageIcon className="text-primary" size={32} />
        <h1 className="text-3xl font-black text-white">Platform Assets</h1>
      </div>

      <p className="text-muted mb-8">
        Manage platform images, logos, badges, and visual assets. Changes apply immediately across the platform.
      </p>

      {/* Coin Image */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Coins className="text-accent" size={24} />
          <h2 className="text-lg font-bold text-white">Coin Image (TC)</h2>
        </div>
        <p className="text-sm text-muted mb-4">
          This image appears next to TC amounts throughout the platform. Recommended: 64x64px PNG with transparency.
        </p>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 bg-surface2 rounded-xl border-2 border-white/10 flex items-center justify-center">
            {assets.coinImage ? (
              <img src={assets.coinImage} alt="Coin" className="w-16 h-16 object-contain" />
            ) : (
              <Coins className="text-muted" size={48} />
            )}
          </div>
          <div className="flex-1">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-surface2 hover:bg-surface border border-white/10 rounded-lg text-sm text-white transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleUpload('coinImage', e.target.files[0])}
              />
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload New Coin Image'}
            </label>
            <p className="text-xs text-muted mt-2">PNG, JPG, or SVG. Max 2MB.</p>
          </div>
        </div>
      </Card>

      {/* Platform Logo */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="text-primary" size={24} />
          <h2 className="text-lg font-bold text-white">Platform Logo</h2>
        </div>
        <p className="text-sm text-muted mb-4">
          Main logo shown in navbar and login pages. Recommended: Square format, 256x256px minimum.
        </p>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 bg-surface2 rounded-xl border-2 border-white/10 flex items-center justify-center p-4">
            {assets.platformLogo ? (
              <img src={assets.platformLogo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon className="text-muted" size={48} />
            )}
          </div>
          <div className="flex-1">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-surface2 hover:bg-surface border border-white/10 rounded-lg text-sm text-white transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleUpload('platformLogo', e.target.files[0])}
              />
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload New Logo'}
            </label>
            <p className="text-xs text-muted mt-2">PNG, JPG, or SVG. Max 2MB.</p>
          </div>
        </div>
      </Card>

      {/* Platform Banner */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="text-accent" size={24} />
          <h2 className="text-lg font-bold text-white">Platform Banner</h2>
        </div>
        <p className="text-sm text-muted mb-4">
          Hero banner for landing pages. Recommended: 1920x1080px or 16:9 aspect ratio.
        </p>
        <div className="flex items-center gap-6">
          <div className="w-48 h-32 bg-surface2 rounded-xl border-2 border-white/10 flex items-center justify-center overflow-hidden">
            {assets.platformBanner ? (
              <img src={assets.platformBanner} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-muted" size={48} />
            )}
          </div>
          <div className="flex-1">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-surface2 hover:bg-surface border border-white/10 rounded-lg text-sm text-white transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleUpload('platformBanner', e.target.files[0])}
              />
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload New Banner'}
            </label>
            <p className="text-xs text-muted mt-2">PNG or JPG. Max 5MB.</p>
          </div>
        </div>
      </Card>

      {/* Badges Management */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Award className="text-accent" size={24} />
            <h2 className="text-lg font-bold text-white">Achievement Badges</h2>
          </div>
          <Button variant="primary" size="sm" onClick={() => openBadgeModal()}>
            <Plus size={16} className="mr-2" />
            Create Badge
          </Button>
        </div>
        <p className="text-sm text-muted mb-4">
          Create custom badges that can be awarded to users for achievements. Use emoji or upload custom icons.
        </p>
        
        {badges.length === 0 ? (
          <div className="text-center py-8 text-muted">
            No custom badges yet. Create your first badge!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {badges.map(badge => (
              <div key={badge.id} className="p-4 bg-surface2 rounded-lg border border-white/10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden"
                      style={{ backgroundColor: `${badge.color}20`, border: `2px solid ${badge.color}` }}
                    >
                      {badge.icon?.startsWith('http')
                        ? <img src={badge.icon} alt={badge.name} className="w-full h-full object-cover" />
                        : badge.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{badge.name}</p>
                      <p className="text-xs text-muted">{badge.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openBadgeModal(badge)}
                      className="text-primary hover:text-purple-300 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteBadge(badge.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Badge Modal */}
      {badgeModal && (
        <Modal
          open={badgeModal}
          onClose={() => setBadgeModal(false)}
          title={editingBadge ? 'Edit Badge' : 'Create Badge'}
        >
          <div className="space-y-4">
            <Input
              label="Badge Name"
              placeholder="e.g. First Win, Tournament Master"
              value={badgeForm.name}
              onChange={e => setBadgeForm(p => ({ ...p, name: e.target.value }))}
              required
            />
            
            <Textarea
              label="Description"
              placeholder="What this badge represents..."
              value={badgeForm.description}
              onChange={e => setBadgeForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
            />
            
            {/* Icon type toggle */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Icon Type</label>
              <div className="flex gap-2">
                <button onClick={() => setBadgeForm(p => ({ ...p, iconType: 'emoji', icon: '' }))}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${badgeForm.iconType === 'emoji' ? 'bg-primary text-white' : 'bg-surface2 text-muted hover:text-white'}`}>
                  Emoji
                </button>
                <button onClick={() => setBadgeForm(p => ({ ...p, iconType: 'image', icon: '' }))}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${badgeForm.iconType === 'image' ? 'bg-primary text-white' : 'bg-surface2 text-muted hover:text-white'}`}>
                  Image Upload
                </button>
              </div>
            </div>

            {badgeForm.iconType === 'emoji' ? (
              <Input
                label="Emoji Icon"
                placeholder="🏆 or ⭐ or any emoji"
                value={badgeForm.icon}
                onChange={e => setBadgeForm(p => ({ ...p, icon: e.target.value }))}
                required
              />
            ) : (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Badge Image</label>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-surface2 hover:bg-surface border border-white/10 rounded-lg text-sm text-white transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleBadgeImageUpload(e.target.files[0])} />
                  <Upload size={16} />
                  {badgeUploading ? 'Uploading...' : 'Upload Badge Image'}
                </label>
                {badgeForm.icon && <img src={badgeForm.icon} alt="badge preview" className="mt-2 w-12 h-12 rounded-full object-cover border-2 border-white/20" />}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Badge Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={badgeForm.color}
                  onChange={e => setBadgeForm(p => ({ ...p, color: e.target.value }))}
                  className="w-16 h-10 rounded cursor-pointer"
                />
                <Input
                  value={badgeForm.color}
                  onChange={e => setBadgeForm(p => ({ ...p, color: e.target.value }))}
                  placeholder="#FFD700"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-surface2 rounded-lg">
              <p className="text-sm text-muted mb-2">Preview:</p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden"
                  style={{ backgroundColor: `${badgeForm.color}20`, border: `2px solid ${badgeForm.color}` }}
                >
                  {badgeForm.icon?.startsWith('http')
                    ? <img src={badgeForm.icon} alt="badge" className="w-full h-full object-cover" />
                    : (badgeForm.icon || '?')}
                </div>
                <div>
                  <p className="text-white font-semibold">{badgeForm.name || 'Badge Name'}</p>
                  <p className="text-xs text-muted">{badgeForm.description || 'Badge description'}</p>
                </div>
              </div>
            </div>

            <Button onClick={saveBadge} className="w-full">
              {editingBadge ? 'Update Badge' : 'Create Badge'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Instructions */}
      <Card className="p-6 border-blue-500/30 bg-blue-500/5">
        <h3 className="text-white font-bold mb-3">📝 Asset Guidelines</h3>
        <ul className="space-y-2 text-sm text-blue-200">
          <li>• Use PNG format with transparency for logos and coins</li>
          <li>• Optimize images before uploading (use TinyPNG or similar)</li>
          <li>• Test images on both light and dark backgrounds</li>
          <li>• Keep file sizes small for faster loading</li>
          <li>• Changes apply immediately - no cache clearing needed</li>
          <li>• Badges can use emoji (🏆⭐🎮) or custom icons</li>
          <li>• Award badges to users via Admin Users page</li>
        </ul>
      </Card>
    </PageWrapper>
  )
}
