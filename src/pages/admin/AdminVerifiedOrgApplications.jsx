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
import { Shield, CheckCircle2, XCircle, Clock } from 'lucide-react'

export default function AdminVerifiedOrgApplications() {
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
      .from('verified_organizer_applications')
      .select('*, user:user_id(id, username, display_name, avatar_url, email, trust_score, is_host)')
      .order('applied_at', { ascending: false })

    if (filter !== 'all') q = q.eq('status', filter)

    const { data } = await q
    setApplications(data || [])
    setLoading(false)
  }

  async function handleApprove(appId) {
    setActionLoading(true)
    try {
      const { error } = await supabase.rpc('approve_verified_organizer_application', {
        p_application_id: appId,
        p_admin_id: profile.id
      })
      if (error) throw error
      toast.success('Verified organizer approved!')
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
        .from('verified_organizer_applications')
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
      <div className="flex items-center gap-3 mb-8">
        <Shield className="text-accent" size={32} />
        <h1 className="text-3xl font-black text-white">Verified Organizer Applications</h1>
      </div>

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
                      <p className="text-sm text-muted mb-2">@{app.user.username} · Trust Score: {app.user.trust_score}</p>
                      {app.current_host_stats && (
                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-muted">Hosted:</span>
                            <span className="text-white ml-1">{app.current_host_stats.tournamentsHosted || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted">Completed:</span>
                            <span className="text-white ml-1">{app.current_host_stats.tournamentsCompleted || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted">Participants:</span>
                            <span className="text-white ml-1">{app.current_host_stats.totalParticipants || 0}</span>
                          </div>
                        </div>
                      )}
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
        <Modal open={true} onClose={() => setSelectedApp(null)} title="Review Verified Organizer Application" size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-surface2 rounded-lg">
              <Avatar user={selectedApp.user} size="lg" />
              <div>
                <p className="text-white font-bold">{selectedApp.user.display_name || selectedApp.user.username}</p>
                <p className="text-sm text-muted">@{selectedApp.user.username}</p>
                <p className="text-xs text-accent">Trust Score: {selectedApp.user.trust_score}</p>
              </div>
            </div>

            {selectedApp.current_host_stats && (
              <div>
                <p className="text-sm font-semibold text-white mb-2">Host Statistics:</p>
                <div className="grid grid-cols-2 gap-3 p-3 bg-surface2 rounded-lg">
                  <div>
                    <p className="text-lg font-black text-white">{selectedApp.current_host_stats.tournamentsHosted || 0}</p>
                    <p className="text-xs text-muted">Tournaments Hosted</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-white">{selectedApp.current_host_stats.tournamentsCompleted || 0}</p>
                    <p className="text-xs text-muted">Completed</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-white">{selectedApp.current_host_stats.totalParticipants || 0}</p>
                    <p className="text-xs text-muted">Total Participants</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-white">{selectedApp.current_host_stats.reportsAgainst || 0}</p>
                    <p className="text-xs text-muted">Reports Against</p>
                  </div>
                </div>
              </div>
            )}

            {selectedApp.business_info && (
              <div>
                <p className="text-sm font-semibold text-white mb-2">Business Information:</p>
                <p className="text-sm text-white/80 bg-surface2 rounded-lg p-3">{selectedApp.business_info}</p>
              </div>
            )}

            {selectedApp.portfolio_url && (
              <div>
                <p className="text-sm font-semibold text-white mb-2">Portfolio:</p>
                <a
                  href={selectedApp.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {selectedApp.portfolio_url}
                </a>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-white mb-2">Why they should be verified:</p>
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
                    Approve as Verified Organizer
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
