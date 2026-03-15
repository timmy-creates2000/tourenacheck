import { useState, useEffect } from 'react'
import { Calendar, MapPin, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatDateTime } from '../../lib/utils'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming') // upcoming | past | all

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase.from('events').select('*').eq('is_active', true).order('event_date', { ascending: true })
      const now = new Date().toISOString()
      if (filter === 'upcoming') q = q.gte('event_date', now)
      else if (filter === 'past') q = q.lt('event_date', now)
      const { data } = await q.limit(50)
      setEvents(data ?? [])
      setLoading(false)
    }
    load()
  }, [filter])

  const isPast = (date) => date && new Date(date) < new Date()

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-black text-white">🎪 Events</h1>
        <div className="flex gap-1 bg-surface2 rounded-lg p-1">
          {['upcoming', 'past', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-muted">No {filter} events</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map(e => {
            const past = isPast(e.event_date)
            return (
              <Card key={e.id} className={`overflow-hidden ${past ? 'opacity-70' : ''}`}>
                {e.image_url
                  ? <img src={e.image_url} className="w-full h-44 object-cover" alt="" />
                  : <div className="w-full h-44 bg-surface2 flex items-center justify-center text-5xl">🎪</div>}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-base font-bold text-white">{e.title}</h2>
                    <Badge color={past ? 'gray' : 'green'}>{past ? 'Past' : 'Upcoming'}</Badge>
                  </div>
                  {e.description && <p className="text-xs text-muted mb-3 line-clamp-2">{e.description}</p>}
                  <div className="space-y-1.5 text-xs text-muted">
                    {e.event_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-primary" />
                        <span>{formatDateTime(e.event_date)}</span>
                      </div>
                    )}
                    {e.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-primary" />
                        <span>{e.location}</span>
                      </div>
                    )}
                  </div>
                  {e.link_url && (
                    <a href={e.link_url} target="_blank" rel="noreferrer"
                      className="mt-4 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                      <ExternalLink size={12} /> Learn more
                    </a>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </PageWrapper>
  )
}
