import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, formatDateTime } from '../../lib/utils'
import { STATUS_COLORS } from '../../lib/constants'

const TABS = ['Upcoming', 'Ongoing', 'Completed']

export default function MyTournamentsPlayer() {
  const { profile } = useAuth()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Upcoming')

  useEffect(() => { fetchRegistrations() }, [])

  async function fetchRegistrations() {
    const { data } = await supabase
      .from('participants')
      .select('*, tournaments(*)')
      .eq('user_id', profile.id)
      .order('registered_at', { ascending: false })
    setRegistrations(data ?? [])
    setLoading(false)
  }

  const statusMap = {
    Upcoming: ['published', 'approved'],
    Ongoing: ['ongoing'],
    Completed: ['completed', 'cancelled'],
  }

  const filtered = registrations.filter(r => statusMap[tab]?.includes(r.tournaments?.status))

  return (
    <PageWrapper>
      <h1 className="text-3xl font-black text-white mb-6">My Tournaments</h1>

      <div className="flex gap-1 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-white hover:bg-surface2'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎮</div>
          <h3 className="text-xl font-bold text-white mb-2">No {tab.toLowerCase()} tournaments</h3>
          <p className="text-muted mb-6">Discover and join tournaments to compete</p>
          <Link to="/discover"><Button>Discover Tournaments</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const t = r.tournaments
            return (
              <Card key={r.id} className="p-4 hover:bg-surface2 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface2 flex-shrink-0">
                    {t?.thumbnail_url ? <img src={t.thumbnail_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[t?.status]}`}>{t?.status?.replace('_', ' ')}</span>
                      {t?.is_practice && <Badge color="gray" outline>Practice</Badge>}
                      <Badge color={r.status === 'winner' ? 'gold' : r.status === 'eliminated' ? 'red' : 'purple'}>{r.status}</Badge>
                    </div>
                    <h3 className="font-bold text-white truncate">{t?.title}</h3>
                    <p className="text-xs text-muted">{t?.game_name} · {formatDateTime(t?.start_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {r.status === 'winner' && !t?.is_practice && (
                      <p className="text-accent font-bold text-sm">🪙 {formatTC(t?.prize_pool_tc ?? 0)}</p>
                    )}
                    <Link to={`/tournament/${t?.id}`}>
                      <Button variant="secondary" size="sm" className="mt-2">View</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </PageWrapper>
  )
}
