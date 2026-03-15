import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit, Settings, XCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import TournamentCard from '../../components/tournament/TournamentCard'
import Button from '../../components/ui/Button'
import { SkeletonCard } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

const TABS = ['All', 'Draft', 'Pending', 'Approved', 'Published', 'Ongoing', 'Completed']

export default function MyTournaments() {
  const { profile } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')

  useEffect(() => { fetchTournaments() }, [])

  async function fetchTournaments() {
    const { data } = await supabase.from('tournaments').select('*').eq('organizer_id', profile.id).order('created_at', { ascending: false })
    setTournaments(data ?? [])
    setLoading(false)
  }

  async function cancelTournament(id) {
    if (!confirm('Cancel this tournament? All entry fees will be refunded.')) return
    await supabase.from('tournaments').update({ status: 'cancelled' }).eq('id', id)
    toast.success('Tournament cancelled')
    fetchTournaments()
  }

  const filtered = tab === 'All' ? tournaments : tournaments.filter(t => t.status === tab.toLowerCase().replace(' ', '_'))

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-white">My Tournaments</h1>
        <Link to="/create-tournament"><Button><Plus size={16} className="mr-1" />Create Tournament</Button></Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-white hover:bg-surface2'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎪</div>
          <h3 className="text-xl font-bold text-white mb-2">No tournaments yet</h3>
          <p className="text-muted mb-6">Create your first tournament and start earning</p>
          <Link to="/create-tournament"><Button>Create Tournament</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(t => (
            <TournamentCard key={t.id} tournament={t} organizer
              actions={
                <>
                  <Link to={`/manage/${t.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full"><Settings size={13} className="mr-1" />Manage</Button>
                  </Link>
                  {['draft','pending_review','approved','published'].includes(t.status) && (
                    <Button variant="danger" size="sm" onClick={() => cancelTournament(t.id)}><XCircle size={13} /></Button>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
