import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatDate, timeAgo } from '../../lib/utils'

export default function NewsPage() {
  const [articles, setArticles] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('news')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setArticles(data ?? []); setLoading(false) })
  }, [])

  const filtered = articles.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.body?.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) {
    return (
      <PageWrapper className="max-w-2xl">
        <button onClick={() => setSelected(null)} className="text-sm text-muted hover:text-white mb-6 transition-colors">← Back to News</button>
        {selected.image_url && <img src={selected.image_url} className="w-full h-56 object-cover rounded-2xl mb-6" alt="" />}
        <h1 className="text-3xl font-black text-white mb-2">{selected.title}</h1>
        <div className="flex items-center gap-2 text-xs text-muted mb-6">
          <Calendar size={12} />
          <span>{formatDate(selected.created_at)}</span>
          <span>·</span>
          <span>{timeAgo(selected.created_at)}</span>
        </div>
        <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{selected.body}</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-black text-white">📰 News</h1>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search news..."
          className="bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary w-48" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted">No news articles yet</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <Card key={a.id} className="overflow-hidden cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelected(a)}>
              {a.image_url
                ? <img src={a.image_url} className="w-full h-40 object-cover" alt="" />
                : <div className="w-full h-40 bg-surface2 flex items-center justify-center text-4xl">📰</div>}
              <div className="p-4">
                <h2 className="text-sm font-bold text-white mb-1 line-clamp-2">{a.title}</h2>
                <p className="text-xs text-muted line-clamp-2 mb-3">{a.body}</p>
                <div className="flex items-center gap-1 text-xs text-muted">
                  <Calendar size={11} />
                  <span>{formatDate(a.created_at)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
