import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import { SkeletonRow } from '../../components/ui/Skeleton'
import { Shield, Award, TrendingUp, Users } from 'lucide-react'

export default function VerifiedOrganizerCenter() {
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchOrganizers()
  }, [])

  async function fetchOrganizers() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio, trust_score, approved_game_types, verified_organizer_approved_at')
      .eq('is_verified_organizer', true)
      .order('trust_score', { ascending: false })

    // Get tournament stats for each organizer
    const organizersWithStats = await Promise.all(
      (data || []).map(async (org) => {
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('id, status, current_participants')
          .eq('organizer_id', org.id)

        const completed = tournaments?.filter(t => t.status === 'completed').length || 0
        const totalParticipants = tournaments?.reduce((sum, t) => sum + (t.current_participants || 0), 0) || 0

        return {
          ...org,
          tournamentsHosted: tournaments?.length || 0,
          tournamentsCompleted: completed,
          totalParticipants
        }
      })
    )

    setOrganizers(organizersWithStats)
    setLoading(false)
  }

  const filteredOrganizers = filter
    ? organizers.filter(org =>
        org.approved_game_types?.some(game =>
          game.toLowerCase().includes(filter.toLowerCase())
        )
      )
    : organizers

  return (
    <PageWrapper>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-accent" size={32} />
          <h1 className="text-3xl font-black text-white">Verified Organizer Center</h1>
        </div>
        <p className="text-muted">
          Trusted tournament organizers verified by Tourena. These hosts have proven track records and high trust scores.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <Award className="text-primary" size={24} />
            <div>
              <p className="text-2xl font-black text-white">{organizers.length}</p>
              <p className="text-xs text-muted">Verified Organizers</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-accent/30 bg-accent/5">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-accent" size={24} />
            <div>
              <p className="text-2xl font-black text-white">
                {organizers.reduce((sum, org) => sum + org.tournamentsCompleted, 0)}
              </p>
              <p className="text-xs text-muted">Tournaments Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3">
            <Users className="text-green-400" size={24} />
            <div>
              <p className="text-2xl font-black text-white">
                {organizers.reduce((sum, org) => sum + org.totalParticipants, 0)}
              </p>
              <p className="text-xs text-muted">Total Participants</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by game (e.g. FIFA, Valorant, PUBG...)"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted focus:outline-none focus:border-primary"
        />
      </div>

      {/* Organizers Grid */}
      {loading ? (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </Card>
      ) : filteredOrganizers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted">
            {filter ? 'No verified organizers found for this game' : 'No verified organizers yet'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrganizers.map(org => (
            <Card key={org.id} className="p-6 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4 mb-4">
                <Avatar user={org} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      to={`/profile/${org.username}`}
                      className="text-lg font-bold text-white hover:text-primary transition-colors truncate"
                    >
                      {org.display_name || org.username}
                    </Link>
                    <Shield className="text-accent flex-shrink-0" size={16} />
                  </div>
                  <p className="text-sm text-muted mb-2">@{org.username}</p>
                  {org.bio && (
                    <p className="text-sm text-white/70 line-clamp-2 mb-3">{org.bio}</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-surface2 rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-black text-white">{org.tournamentsCompleted}</p>
                  <p className="text-xs text-muted">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-white">{org.totalParticipants}</p>
                  <p className="text-xs text-muted">Participants</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-accent">{org.trust_score}</p>
                  <p className="text-xs text-muted">Trust Score</p>
                </div>
              </div>

              {/* Games */}
              {org.approved_game_types && org.approved_game_types.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted mb-2">Approved Games:</p>
                  <div className="flex flex-wrap gap-1">
                    {org.approved_game_types.slice(0, 5).map((game, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                      >
                        {game}
                      </span>
                    ))}
                    {org.approved_game_types.length > 5 && (
                      <span className="text-xs px-2 py-1 bg-white/5 text-muted rounded-full">
                        +{org.approved_game_types.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Link to={`/profile/${org.username}`}>
                <Button variant="secondary" size="sm" className="w-full">
                  View Profile
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
