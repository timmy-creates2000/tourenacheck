import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react'

const CATEGORIES = ['general','tournament','update','esports','community']
const EMPTY = { title:'', body:'', category:'general', link_url:'', is_featured:false, is_published:false, image_url:'', video_url:'' }

export default function AdminNews() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')
  const [filter, setFilter] = useState('all')

  async function load() {
    setLoading(true)
    let q = supabase.from('news').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('category', filter)
    const { data, error } = await q
    if (error) toast.error('Failed to load news')
    else setArticles(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  function openCreate() { setForm(EMPTY); setModal('create') }
  function openEdit(a) { setForm({ ...a }); setModal(a) }
  function closeModal() { setModal(null) }

  async function uploadFile(e, field) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(field)
    const ext = file.name.split('.').pop()
    const path = `news/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(''); return }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
    setForm(f => ({ ...f, [field]: publicUrl }))
    setUploading('')
  }

  async function save() {
    setSaving(true)
    const payload = {
      ...form,
      published_at: form.is_published ? (form.published_at || new Date().toISOString()) : null,
    }
    let error
    if (modal === 'create') {
      ;({ error } = await supabase.from('news').insert(payload))
    } else {
      ;({ error } = await supabase.from('news').update(payload).eq('id', modal.id))
    }
    if (error) toast.error(error.message)
    else { toast.success(modal === 'create' ? 'Article created' : 'Article updated'); closeModal(); load() }
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Delete this article?')) return
    const { error } = await supabase.from('news').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); load() }
  }

  async function togglePublish(a) {
    const is_published = !a.is_published
    const { error } = await supabase.from('news').update({
      is_published,
      published_at: is_published ? new Date().toISOString() : null
    }).eq('id', a.id)
    if (error) toast.error(error.message)
    else load()
  }

  const CATEGORY_COLORS = { general:'bg-blue-500/20 text-blue-400', tournament:'bg-purple-500/20 text-purple-400', update:'bg-yellow-500/20 text-yellow-400', esports:'bg-green-500/20 text-green-400', community:'bg-pink-500/20 text-pink-400' }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">News & Articles</h1>
          <p className="text-muted text-sm mt-1">Manage platform news and blog posts</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Article
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['all', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${filter === c ? 'bg-primary text-white' : 'bg-surface2 text-muted hover:text-white'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 text-muted">No articles found.</div>
      ) : (
        <div className="grid gap-4">
          {articles.map(a => (
            <div key={a.id} className="bg-surface border border-white/10 rounded-xl p-4 flex items-center gap-4">
              {a.image_url
                ? <img src={a.image_url} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" alt={a.title} />
                : <div className="w-16 h-16 rounded-lg bg-surface2 flex items-center justify-center text-2xl flex-shrink-0">📰</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{a.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[a.category] ?? 'bg-surface2 text-muted'}`}>{a.category}</span>
                  {a.is_featured && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Featured</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_published ? 'bg-green-500/20 text-green-400' : 'bg-surface2 text-muted'}`}>
                    {a.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                {a.body && <p className="text-muted text-sm mt-1 line-clamp-1">{a.body}</p>}
                <p className="text-xs text-muted mt-1">{new Date(a.created_at).toLocaleDateString()}{a.published_at && ` · Published ${new Date(a.published_at).toLocaleDateString()}`}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => togglePublish(a)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${a.is_published ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
                  {a.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => openEdit(a)} className="p-2 text-muted hover:text-white hover:bg-surface2 rounded-lg transition-colors"><Pencil size={15} /></button>
                <button onClick={() => remove(a.id)} className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <NewsModal form={form} setForm={setForm} onSave={save} onClose={closeModal} saving={saving} uploading={uploading} uploadFile={uploadFile} isEdit={modal !== 'create'} />}
    </div>
  )
}

function NewsModal({ form, setForm, onSave, onClose, saving, uploading, uploadFile, isEdit }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const CATEGORIES = ['general','tournament','update','esports','community']
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Article' : 'New Article'}</h2>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted mb-1 block">Title *</label>
            <input value={form.title} onChange={e => f('title', e.target.value)} className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Article title" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Category</label>
            <select value={form.category} onChange={e => f('category', e.target.value)} className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Body</label>
            <textarea value={form.body} onChange={e => f('body', e.target.value)} rows={5} className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none" placeholder="Write your article content here..." />
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
              <input type="checkbox" checked={form.is_published} onChange={e => f('is_published', e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-white">Publish now</span>
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
