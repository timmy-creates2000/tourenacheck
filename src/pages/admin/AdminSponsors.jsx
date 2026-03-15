import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const EMPTY = { name: '', logo_url: '', website_url: '', description: '', tier: 'bronze', is_active: true }

export default function AdminSponsors() {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)

  useEffect(() => { fetchSponsors() }, [])

  async function fetchSponsors() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load sponsors')
    else setSponsors(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null); setForm(EMPTY); setLogoFile(null); setModal(true)
  }

  function openEdit(s) {
    setEditing(s.id)
    setForm({ name: s.name, logo_url: s.logo_url ?? '', website_url: s.website_url ?? '', description: s.description ?? '', tier: s.tier ?? 'bronze', is_active: s.is_active ?? true })
    setLogoFile(null); setModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      let logo_url = form.logo_url
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `sponsors/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('media').upload(path, logoFile, { upsert: true })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
        logo_url = urlData.publicUrl
      }
      const payload = { ...form, logo_url }
      if (editing) {
        const { error } = await supabase.from('sponsors').update(payload).eq('id', editing)
        if (error) throw error
        toast.success('Sponsor updated')
      } else {
        const { error } = await supabase.from('sponsors').insert(payload)
        if (error) throw error
        toast.success('Sponsor created')
      }
      setModal(false); fetchSponsors()
    } catch (e) {
      toast.error(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this sponsor?')) return
    const { error } = await supabase.from('sponsors').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); fetchSponsors() }
  }

  async function toggleActive(s) {
    const { error } = await supabase.from('sponsors').update({ is_active: !s.is_active }).eq('id', s.id)
    if (error) toast.error(error.message)
    else fetchSponsors()
  }

  const tierColor = {
    gold: 'text-yellow-400 bg-yellow-400/10',
    silver: 'text-gray-300 bg-gray-300/10',
    bronze: 'text-orange-400 bg-orange-400/10',
    platinum: 'text-cyan-400 bg-cyan-400/10',
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sponsors</h1>
          <p className="text-muted text-sm mt-1">{sponsors.length} sponsor{sponsors.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Add Sponsor
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : sponsors.length === 0 ? (
        <div className="text-center py-20 text-muted">No sponsors yet. Add one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sponsors.map(s => (
            <div key={s.id} className="bg-surface border border-white/[0.08] rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {s.logo_url
                    ? <img src={s.logo_url} alt={s.name} className="w-12 h-12 rounded-lg object-contain bg-surface2" />
                    : <div className="w-12 h-12 rounded-lg bg-surface2 flex items-center justify-center text-lg font-bold text-muted">{s.name[0]}</div>
                  }
                  <div>
                    <p className="font-semibold text-white">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${tierColor[s.tier] ?? 'text-muted bg-surface2'}`}>{s.tier}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {s.description && <p className="text-muted text-sm line-clamp-2">{s.description}</p>}
              {s.website_url && (
                <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline truncate">
                  {s.website_url}
                </a>
              )}
              <div className="flex gap-2 mt-auto pt-2 border-t border-white/[0.06]">
                <button onClick={() => openEdit(s)} className="flex-1 text-sm py-1.5 rounded-lg bg-surface2 hover:bg-white/10 text-white transition-colors">Edit</button>
                <button onClick={() => toggleActive(s)} className="flex-1 text-sm py-1.5 rounded-lg bg-surface2 hover:bg-white/10 text-muted transition-colors">
                  {s.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(s.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors">Del</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">{editing ? 'Edit Sponsor' : 'Add Sponsor'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Sponsor name" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Logo</label>
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])}
                  className="w-full text-sm text-muted file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-surface2 file:text-white file:text-sm" />
                {form.logo_url && !logoFile && <p className="text-xs text-muted mt-1 truncate">Current: {form.logo_url}</p>}
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Website URL</label>
                <input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                  className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none" placeholder="Short description..." />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Tier</label>
                <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
                  className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-primary" />
                <span className="text-sm text-white">Active</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)} className="flex-1 py-2 rounded-lg bg-surface2 text-muted hover:text-white text-sm transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
