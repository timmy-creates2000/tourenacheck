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
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

export default function AdminHostApplications() {
  const { profile } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedApp, setSelectedApp] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { fetchApplications() }, [filter])

  async function fetchApplications() {
    setLoading(true)
    let q = supabase
      .from('host_applications')
      .select('*, user:user_id(id, username, display_name, avatar_url, email, created_at)')
      .order('applied_at', { ascending: false })

    if (filter !== 'all') q = q.eq('status', filter)

    const { data } = await q
    setApplications(data || [])
    setLoading(false)
  }

  async function handleApprove(appId) {
    setActionLoading(true)
    try {
      const { error } = await supabase.rpc('approve_host_application', {
        p_application_id: appId,
        p_admin_id: profile.id
      })
      if (error) throw error
      toast.success('Host application approved!')
      fetchApplications()
      setSelectedApp(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject(appId) {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('host_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id
        })
        .eq('id', appId)
      if (error) throw error
      toast.success('Application rejected')
      fetchApplications()
      setSelectedApp(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const stats = {
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  }

  return (
    <PageWrapper>
      <h1 className="text-3xl font-black text-white mb-8">Host Applications</h1>

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

      {/* Applications List */}
      <Card>
        {loading ? (
          <div className="divide-y divide-white/[0.06]">
            {Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-muted">No applications found</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {applications.map(app => (
              <div key={app.id} className="p-4 hover:bg-surface2 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Avatar user={app.user} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{app.user.display_name || app.user.username}</p>
                      <p className="text-sm text-muted mb-2">@{app.user.username} · {app.user.email}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {app.game_types.map((game, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            {game}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted">Applied {formatDateTime(app.applied_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      app.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      app.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {app.status}
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedApp(app)}>
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
      {selectedApp && (
        <Modal open={true} onClose={() => setSelectedApp(null)} title="Review Host Application" size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-surface2 rounded-lg">
              <Avatar user={selectedApp.user} size="lg" />
              <div>
                <p className="text-white font-bold">{selectedApp.user.display_name || selectedApp.user.username}</p>
                <p className="text-sm text-muted">@{selectedApp.user.username}</p>
                <p className="text-xs text-muted">Member since {formatDateTime(selectedApp.user.created_at)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Games to Host:</p>
              <div className="flex flex-wrap gap-2">
                {selectedApp.game_types.map((game, i) => (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm">
                    {game}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Experience:</p>
              <p className="text-sm text-white/80 bg-surface2 rounded-lg p-3">{selectedApp.experience}</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Game Credentials:</p>
              <p className="text-sm text-white/80 bg-surface2 rounded-lg p-3">{selectedApp.game_credentials}</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Motivation:</p>
              <p className="text-sm text-white/80 bg-surface2 rounded-lg p-3">{selectedApp.motivation}</p>
            </div>

            {selectedApp.status === 'pending' && (
              <>
                <Textarea
                  label="Rejection Reason (if rejecting)"
                  placeholder="Explain why this application is being rejected..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(selectedApp.id)}
                    loading={actionLoading}
                    variant="accent"
                    className="flex-1"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedApp.id)}
                    loading={actionLoading}
                    variant="danger"
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </>
            )}

            {selectedApp.status === 'rejected' && selectedApp.rejection_reason && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-400 mb-1">Rejection Reason:</p>
                <p className="text-sm text-red-300">{selectedApp.rejection_reason}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </PageWrapper>
  )
}
