import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, Upload, Calendar } from 'lucide-react'

const EMPTY = { title:'', description:'', link_url:'', location:'', event_date:'', is_featured:false, is_active:true, image_url:'', video_url:'' }

export default function AdminEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true })
    if (error) toast.error('Failed to load events')
    else setEvents(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() { setForm(EMPTY); setModal('create') }
  function openEdit(ev) { setForm({ ...ev, event_date: ev.event_date?.slice(0,16) ?? '' }); setModal(ev) }
  function closeModal() { setModal(null) }

  async function uploadFile(e, field) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(field)
    const ext = file.name.split('.').pop()
    const path = `events/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(''); return }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
    setForm(f => ({ ...f, [field]: publicUrl }))
    setUploading('')
  }

  async function save() {
    setSaving(true)
    const payload = { ...form, event_date: form.event_date || null }
    let error
    if (modal === 'create') {
      ;({ error } = await supabase.from('events').insert(payload))
    } else {
      ;({ error } = await supabase.from('events').update(payload).eq('id', modal.id))
    }
    if (error) toast.error(error.message)
    else { toast.success(modal === 'create' ? 'Event created' : 'Event updated'); closeModal(); load() }
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Delete this event?')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); load() }
  }

  async function toggleFeatured(ev) {
    const { error } = await supabase.from('events').update({ is_featured: !ev.is_featured }).eq('id', ev.id)
    if (error) toast.error(error.message)
    else load()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-muted text-sm mt-1">Manage platform events and announcements</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-muted">No events yet.</div>
      ) : (
        <div className="grid gap-4">
          {events.map(ev => (
            <div key={ev.id} className="bg-surface border border-white/10 rounded-xl p-4 flex items-center gap-4">
              {ev.image_url
                ? <img src={ev.image_url} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" alt={ev.title} />
                : <div className="w-16 h-16 rounded-lg bg-surface2 flex items-center justify-center text-2xl flex-shrink-0">🎮</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{ev.title}</span>
                  {ev.is_featured && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Featured</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ev.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {ev.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {ev.event_date && (
                  <div className="flex items-center gap-1 text-xs text-muted mt-1">
                    <Calendar size={11} /> {new Date(ev.event_date).toLocaleString()}
                    {ev.location && <span className="ml-2">📍 {ev.location}</span>}
                  </div>
                )}
                {ev.description && <p className="text-muted text-sm mt-1 truncate">{ev.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleFeatured(ev)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${ev.is_featured ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10' : 'border-white/20 text-muted hover:text-white hover:bg-surface2'}`}>
                  {ev.is_featured ? 'Unfeature' : 'Feature'}
                </button>
                <button onClick={() => openEdit(ev)} className="p-2 text-muted hover:text-white hover:bg-surface2 rounded-lg transition-colors"><Pencil size={15} /></button>
                <button onClick={() => remove(ev.id)} className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <EventModal form={form} setForm={setForm} onSave={save} onClose={closeModal} saving={saving} uploading={uploading} uploadFile={uploadFile} isEdit={modal !== 'create'} />}
    </div>
  )
}

function EventModal({ form, setForm, onSave, onClose, saving, uploading, uploadFile, isEdit }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted mb-1 block">Title *</label>
            <input value={form.title} onChange={e => f('title', e.target.value)} className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Event title" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={3} className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none" placeholder="Event details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Event Date</label>
              <input type="datetime-local" value={form.event_date} onChange={e => f('event_date', e.target.value)} className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Location</label>
              <input value={form.location} onChange={e => f('location', e.target.value)} className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="City or Online" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Link URL</label>
            <input value={form.link_url} onChange={e => f('link_url', e.target.value)} className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="https://..." />
          </div>
          <FileUploadField label="Image" field="image_url" form={form} uploading={uploading} uploadFile={uploadFile} accept="image/*" />
          <FileUploadField label="Video" field="video_url" form={form} uploading={uploading} uploadFile={uploadFile} accept="video/*" />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={e => f('is_featured', e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-white">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-white">Active</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/10">
          <button onClick={onClose} className="flex-1 bg-surface2 hover:bg-surface border border-white/10 text-white py-2 rounded-lg text-sm transition-colors">Cancel</button>
          <button onClick={onSave} disabled={saving || !form.title} className="flex-1 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FileUploadField({ label, field, form, uploading, uploadFile, accept }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      {form[field] && <div className="mb-2 text-xs text-green-400 truncate">{form[field]}</div>}
      <label className="flex items-center gap-2 cursor-pointer bg-surface2 border border-dashed border-white/20 hover:border-primary/50 rounded-lg px-3 py-2 transition-colors">
        <Upload size={14} className="text-muted" />
        <span className="text-sm text-muted">{uploading === field ? 'Uploading...' : `Upload ${label}`}</span>
        <input type="file" accept={accept} className="hidden" onChange={e => uploadFile(e, field)} disabled={uploading === field} />
      </label>
    </div>
  )
}
