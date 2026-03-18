import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Input'
import Avatar from '../../components/ui/Avatar'
import { SkeletonRow } from '../../components/ui/Skeleton'
import { formatDateTime } from '../../lib/utils'
import toast from 'react-hot-toast'
import { Gamepad2, CheckCircle2, XCircle, Clock } from 'lucide-react'

export default function AdminGameRegistrations() {
  const { profile } = useAuth()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedReg, setSelectedReg] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { fetchRegistrations() }, [filter])

  async function fetchRegistrations() {
    setLoading(true)
    let q = supabase
      .from('organizer_game_registrations')
      .select('*, organizer:organizer_id(id, username, display_name, avatar_url, trust_score, is_verified_organizer)')
      .order('registered_at', { ascending: false })

    if (filter !== 'all') q = q.eq('status', filter)

    const { data } = await q
    setRegistrations(data || [])
    setLoading(false)
  }

  async function handleApprove(regId) {
    setActionLoading(true)
    try {
      const reg = registrations.find(r => r.id === regId)
      
      // Update registration
      const { error: regError } = await supabase
        .from('organizer_game_registrations')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile.id
        })
        .eq('id', regId)
      
      if (regError) throw regError

      // Add game to organizer's approved_game_types
      const { data: userData } = await supabase
        .from('users')
        .select('approved_game_types')
        .eq('id', reg.organizer_id)
        .single()

      const currentGames = userData?.approved_game_types || []
      if (!currentGames.includes(reg.game_name)) {
        const { error: userError } = await supabase
          .from('users')
          .update({
            approved_game_types: [...currentGames, reg.game_name]
          })
          .eq('id', reg.organizer_id)
        
        if (userError) throw userError
      }

      toast.success('Game registration approved!')
      fetchRegistrations()
      setSelectedReg(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject(regId) {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('organizer_game_registrations')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason,
          approved_at: new Date().toISOString(),
          approved_by: profile.id
        })
        .eq('id', regId)
      
      if (error) throw error
      toast.success('Registration rejected')
      fetchRegistrations()
      setSelectedReg(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const stats = {
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length
  }

  return (
    <PageWrapper>
      <div className="flex items-center gap-3 mb-8">
        <Gamepad2 className="text-primary" size={32} />
        <h1 className="text-3xl font-black text-white">Game Registrations</h1>
      </div>

      <p className="text-muted mb-6">
        Verified organizers must register each game type they want to host. Approve registrations after verifying credentials.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <Clock className="text-amber-400" size={24} />
            <div>
              <p className="text-2xl font-black text-white">{stats.pending}</p>
              <p className="text-xs text-muted">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-green-400" size={24} />
            <div>
              <p className="text-2xl font-black text-white">{stats.approved}</p>
              <p className="text-xs text-muted">Approved</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <XCircle className="text-red-400" size={24} />
            <div>
              <p className="text-2xl font-black text-white">{stats.rejected}</p>
              <p className="text-xs text-muted">Rejected</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Registrations List */}
      <Card>
        {loading ? (
          <div className="divide-y divide-white/[0.06]">
            {Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-12 text-muted">No registrations found</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {registrations.map(reg => (
              <div key={reg.id} className="p-4 hover:bg-surface2 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Avatar user={reg.organizer} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold">{reg.organizer.display_name || reg.organizer.username}</p>
                        {reg.organizer.is_verified_organizer && (
                          <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">Verified ✓</span>
                        )}
                      </div>
                      <p className="text-sm text-muted mb-2">@{reg.organizer.username} · Trust: {reg.organizer.trust_score}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-primary">Game:</span>
                        <span className="text-sm text-white">{reg.game_name}</span>
                      </div>
                      <p className="text-xs text-muted">Registered {formatDateTime(reg.registered_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      reg.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      reg.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {reg.status}
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedReg(reg)}>
                      Review
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Review Modal */}
      {selectedReg && (
        <Modal open={true} onClose={() => setSelectedReg(null)} title="Review Game Registration" size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-surface2 rounded-lg">
              <Avatar user={selectedReg.organizer} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold">{selectedReg.organizer.display_name || selectedReg.organizer.username}</p>
                  {selectedReg.organizer.is_verified_organizer && (
                    <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">Verified ✓</span>
                  )}
                </div>
                <p className="text-sm text-muted">@{selectedReg.organizer.username}</p>
                <p className="text-xs text-accent">Trust Score: {selectedReg.organizer.trust_score}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Game:</p>
              <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-lg font-bold text-primary">{selectedReg.game_name}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Game Credentials:</p>
              <p className="text-sm text-white/80 bg-surface2 rounded-lg p-3 whitespace-pre-wrap">{selectedReg.game_credentials}</p>
            </div>

            {selectedReg.status === 'pending' && (
              <>
                <Textarea
                  label="Rejection Reason (if rejecting)"
                  placeholder="Explain why this registration is being rejected..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(selectedReg.id)}
                    loading={actionLoading}
                    variant="accent"
                    className="flex-1"
                  >
                    Approve Game
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedReg.id)}
                    loading={actionLoading}
                    variant="danger"
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </>
            )}

            {selectedReg.status === 'rejected' && selectedReg.rejection_reason && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-400 mb-1">Rejection Reason:</p>
                <p className="text-sm text-red-300">{selectedReg.rejection_reason}</p>
              </div>
            )}

            {selectedReg.status === 'approved' && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-400">
                  ✓ This game has been approved for {selectedReg.organizer.username}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </PageWrapper>
  )
}
