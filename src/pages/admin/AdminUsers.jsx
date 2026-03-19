/**
 * AdminUsers.jsx
 * Full user management page for platform admins.
 *
 * Features:
 * - View all users with search + role + status filters
 * - Approve (organizers only by default) / Reject / Suspend / Reinstate
 * - Bulk approve pending organizers
 * - Adjust individual TC balance (grant or deduct)
 * - Promo: send TC to a filtered group of users (all / all organizers / all players / all approved)
 * - Promote/demote moderator with granular permission toggles
 * - Change user role (player ↔ organizer)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, formatDate } from '../../lib/utils'
import { STATUS_COLORS, BADGES } from '../../lib/constants'
import toast from 'react-hot-toast'

const MOD_PERMISSIONS = [
  { key: 'review_tournaments', label: 'Review Tournaments', desc: 'Approve or reject tournament submissions' },
  { key: 'manage_users',       label: 'Manage Users',       desc: 'Approve, suspend, reject user accounts' },
  { key: 'manage_reports',     label: 'Manage Reports',     desc: 'Review and action content reports' },
  { key: 'manage_communities', label: 'Manage Communities', desc: 'Suspend or restore communities and groups' },
  { key: 'manage_news',        label: 'Manage News',        desc: 'Create, edit and publish news and events' },
]

const PROMO_TARGETS = [
  { value: 'all_approved', label: 'All Approved Users' },
  { value: 'all_organizers', label: 'All Approved Organizers' },
  { value: 'all_players', label: 'All Approved Players' },
  { value: 'single', label: 'Single User (use Adjust TC instead)' },
]

export default function AdminUsers() {
  const { profile: adminProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState({ role: '', status: 'pending' })
  const [search, setSearch] = useState('')

  // Modals
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [adjustModal, setAdjustModal] = useState(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [modModal, setModModal] = useState(null)
  const [modPerms, setModPerms] = useState({})
  const [promoModal, setPromoModal] = useState(false)
  const [promoTarget, setPromoTarget] = useState('all_approved')
  const [promoAmount, setPromoAmount] = useState('')
  const [promoReason, setPromoReason] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [roleModal, setRoleModal] = useState(null)
  const [badgeModal, setBadgeModal] = useState(null)
  const [badgeLoading, setBadgeLoading] = useState(false)
  const [userBadges, setUserBadges] = useState([])
  const [allBadges, setAllBadges] = useState([]) // system + custom merged

  const [actionLoading, setActionLoading] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase.from('users').select('*').order('created_at', { ascending: false })
      if (filter.role) q = q.eq('role', filter.role)
      if (filter.status) q = q.eq('account_status', filter.status)
      if (search) q = q.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
      const { data, error: err } = await q
      if (err) throw err
      setUsers(data ?? [])
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function updateStatus(userId, status, reason = null) {
    setActionLoading(userId)
    try {
      const { error } = await supabase.from('users')
        .update({ account_status: status, rejection_reason: reason ?? null }).eq('id', userId)
      if (error) throw error
      toast.success(`User ${status}`)
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function changeRole(userId, newRole) {
    setActionLoading(userId)
    try {
      const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)
      if (error) throw error
      toast.success(`Role changed to ${newRole}`)
      setRoleModal(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function adjustBalance(userId, amount, reason) {
    const delta = parseInt(amount)
    if (isNaN(delta) || delta === 0) { toast.error('Enter a valid amount'); return }
    if (!reason.trim()) { toast.error('Please enter a reason'); return }
    setActionLoading(userId)
    try {
      if (delta > 0) {
        await supabase.rpc('credit_coins', {
          p_user_id: userId,
          p_amount: delta,
          p_type: 'admin_grant',
          p_description: reason,
        })
      } else {
        await supabase.rpc('debit_coins', {
          p_user_id: userId,
          p_amount: Math.abs(delta),
          p_type: 'admin_deduct',
          p_description: reason,
        })
      }
      toast.success(`Balance adjusted by ${delta > 0 ? '+' : ''}${delta} TC`)
      setAdjustModal(null)
      setAdjustAmount('')
      setAdjustReason('')
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function saveModerator(user) {
    setActionLoading(user.id)
    const hasAnyPerm = Object.values(modPerms).some(Boolean)
    try {
      const { error } = await supabase.from('users').update({
        is_moderator: hasAnyPerm,
        moderator_permissions: modPerms,
      }).eq('id', user.id)
      if (error) throw error
      toast.success(hasAnyPerm ? `${user.username} is now a moderator` : `${user.username} moderator role removed`)
      setModModal(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  function openModModal(u) {
    setModPerms(u.moderator_permissions ?? {})
    setModModal(u)
  }

  async function toggleVerify(u) {
    setActionLoading(u.id + '_verify')
    try {
      const { error } = await supabase.from('users').update({ is_verified: !u.is_verified }).eq('id', u.id)
      if (error) throw error
      toast.success(u.is_verified ? `${u.username} unverified` : `${u.username} is now verified`)
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // Bulk approve — only approves pending ORGANIZERS
  const pendingOrganizers = users.filter(u => u.account_status === 'pending' && u.role === 'organizer')

  async function bulkApproveOrganizers() {
    if (pendingOrganizers.length === 0) { toast.error('No pending organizers'); return }
    try {
      const { error } = await supabase.from('users')
        .update({ account_status: 'approved' })
        .in('id', pendingOrganizers.map(u => u.id))
      if (error) throw error
      toast.success(`Approved ${pendingOrganizers.length} organizer${pendingOrganizers.length > 1 ? 's' : ''}`)
      setBulkConfirm(false)
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Promo: grant TC to a group of users
  async function sendPromo() {
    const amount = parseInt(promoAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid TC amount'); return }
    if (!promoReason.trim()) { toast.error('Enter a reason / promo description'); return }
    setPromoLoading(true)
    try {
      let q = supabase.from('users').select('id').eq('account_status', 'approved')
      if (promoTarget === 'all_organizers') q = q.eq('role', 'organizer')
      if (promoTarget === 'all_players') q = q.eq('role', 'player')
      const { data: targets, error: e1 } = await q
      if (e1) throw e1
      if (!targets?.length) { toast.error('No users match this target'); setPromoLoading(false); return }

      // Credit each user — batch in groups of 20 to avoid timeout
      let credited = 0
      for (const u of targets) {
        await supabase.rpc('credit_coins', {
          p_user_id: u.id,
          p_amount: amount,
          p_type: 'admin_grant',
          p_description: promoReason,
        })
        credited++
      }
      toast.success(`Promo sent: ${formatTC(amount)} to ${credited} users`)
      setPromoModal(false)
      setPromoAmount('')
      setPromoReason('')
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPromoLoading(false)
    }
  }

  async function openBadgeModal(u) {
    // Load user's existing badges
    const { data } = await supabase.from('player_badges').select('badge_type').eq('user_id', u.id)
    setUserBadges((data ?? []).map(b => b.badge_type))

    // Load system badge overrides + custom badges from platform_settings
    const { data: settings } = await supabase.from('platform_settings').select('key,value')
      .or('key.like.badge_override_%,key.like.badge_custom_%')
    const overrides = {}
    const customs = []
    ;(settings ?? []).forEach(row => {
      try {
        const val = JSON.parse(row.value)
        if (row.key.startsWith('badge_override_')) overrides[row.key.replace('badge_override_', '')] = val
        else if (row.key.startsWith('badge_custom_')) customs.push({ type: row.key, ...val })
      } catch {}
    })
    const merged = [
      ...BADGES.map(b => ({ ...b, ...(overrides[b.type] ?? {}), type: b.type })),
      ...customs,
    ]
    setAllBadges(merged)
    setBadgeModal(u)
  }

  async function awardBadge(badge) {
    if (!badgeModal) return
    if (userBadges.includes(badge.type)) {
      // Revoke
      setBadgeLoading(true)
      await supabase.from('player_badges').delete().eq('user_id', badgeModal.id).eq('badge_type', badge.type)
      setUserBadges(prev => prev.filter(t => t !== badge.type))
      toast.success(`Revoked "${badge.name}" from ${badgeModal.username}`)
      setBadgeLoading(false)
    } else {
      // Award
      setBadgeLoading(true)
      await supabase.from('player_badges').upsert({
        user_id: badgeModal.id,
        badge_type: badge.type,
        badge_name: badge.name,
        badge_description: badge.description,
      }, { onConflict: 'user_id,badge_type', ignoreDuplicates: true })
      setUserBadges(prev => [...prev, badge.type])
      toast.success(`Awarded "${badge.name}" to ${badgeModal.username}`)
      setBadgeLoading(false)
    }
  }

  const STATUS_TABS = ['pending', 'approved', 'rejected', 'suspended', '']

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-black text-white">Users</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setPromoModal(true)}>Send Promo TC</Button>
          <Button variant="secondary" onClick={() => setBulkConfirm(true)}>
            Bulk Approve Organizers {pendingOrganizers.length > 0 && `(${pendingOrganizers.length})`}
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setFilter(p => ({ ...p, status: s }))}
            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${filter.status === s ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-white hover:bg-surface2'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username or email..."
          className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
        <select value={filter.role} onChange={e => setFilter(p => ({ ...p, role: e.target.value }))}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="">All Roles</option>
          <option value="player">Player</option>
          <option value="organizer">Organizer</option>
        </select>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" onClick={fetchUsers}>Retry</Button>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['User', 'Role', 'Status', 'Verified', 'Balance', 'Country', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted">No users found</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className={`hover:bg-surface2 transition-colors ${u.account_status === 'pending' ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-4 py-3"><Avatar user={u} size={32} showName linkable /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === 'organizer' ? 'bg-amber-600 text-amber-100' : 'bg-purple-600 text-purple-100'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[u.account_status] ?? 'bg-gray-600 text-gray-200'}`}>
                        {u.account_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_verified
                        ? <span className="flex items-center gap-1 text-xs font-semibold text-blue-400"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="#3B82F6"/><path d="M4.5 8.5L6.5 10.5L11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Verified</span>
                        : <span className="text-xs text-muted">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-accent font-semibold">{formatTC(u.coin_balance ?? 0)}</td>
                    <td className="px-4 py-3 text-muted">{u.country ?? '—'}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.account_status === 'pending' && (
                          <>
                            <Button size="sm" variant="secondary" loading={actionLoading === u.id} onClick={() => updateStatus(u.id, 'approved')}>Approve</Button>
                            <Button size="sm" variant="danger" onClick={() => { setRejectModal(u); setRejectReason('') }}>Reject</Button>
                          </>
                        )}
                        {u.account_status === 'approved' && (
                          <Button size="sm" variant="danger" loading={actionLoading === u.id} onClick={() => updateStatus(u.id, 'suspended')}>Suspend</Button>
                        )}
                        {(u.account_status === 'suspended' || u.account_status === 'rejected') && (
                          <Button size="sm" variant="secondary" loading={actionLoading === u.id} onClick={() => updateStatus(u.id, 'approved')}>Reinstate</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setAdjustModal(u); setAdjustAmount(''); setAdjustReason('') }}>Adjust TC</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRoleModal(u)}>Change Role</Button>
                        {!u.is_admin && (
                          <Button size="sm" variant="ghost" onClick={() => openModModal(u)}>
                            {u.is_moderator ? 'Mod Perms' : 'Make Mod'}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost"
                          loading={actionLoading === u.id + '_verify'}
                          onClick={() => toggleVerify(u)}>
                          {u.is_verified ? 'Unverify' : 'Verify'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openBadgeModal(u)}>Badges</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reject Modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Account">
        <div className="space-y-4">
          <p className="text-sm text-muted">Rejecting <span className="text-white font-semibold">{rejectModal?.username}</span></p>
          <Input label="Rejection Reason" placeholder="Explain why this account was rejected..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={() => { updateStatus(rejectModal.id, 'rejected', rejectReason); setRejectModal(null) }}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Adjust TC Modal */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title="Adjust TC Balance">
        <div className="space-y-4">
          <div className="bg-surface2 rounded-xl p-3 text-sm flex justify-between">
            <span className="text-muted">Current balance</span>
            <span className="text-accent font-bold">{formatTC(adjustModal?.coin_balance ?? 0)}</span>
          </div>
          <Input label="Amount (positive to add, negative to deduct)" type="number" placeholder="e.g. 100 or -50"
            value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
          <Input label="Reason (required)" placeholder="e.g. Compensation for bug, Admin bonus..."
            value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
          {adjustAmount && !isNaN(parseInt(adjustAmount)) && (
            <div className="text-xs text-muted bg-surface2 rounded-lg p-3 flex justify-between">
              <span>New balance</span>
              <span className="text-white font-bold">{formatTC(Math.max(0, (adjustModal?.coin_balance ?? 0) + parseInt(adjustAmount)))}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAdjustModal(null)}>Cancel</Button>
            <Button className="flex-1" loading={actionLoading === adjustModal?.id}
              onClick={() => adjustBalance(adjustModal.id, adjustAmount, adjustReason)}>
              Apply
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title="Change User Role">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Change role for <span className="text-white font-semibold">{roleModal?.username}</span>.
            Current role: <span className="text-accent font-semibold capitalize">{roleModal?.role}</span>
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
            Changing to organizer will allow this user to create tournaments. Changing to player will remove organizer access.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => changeRole(roleModal.id, 'player')}
              className={`p-4 rounded-xl border text-sm font-semibold transition-all ${roleModal?.role === 'player' ? 'border-primary bg-primary/10 text-white' : 'border-white/10 text-muted hover:border-white/20 hover:text-white'}`}>
              Player
              <p className="text-xs font-normal text-muted mt-1">Discover and join tournaments</p>
            </button>
            <button onClick={() => changeRole(roleModal.id, 'organizer')}
              className={`p-4 rounded-xl border text-sm font-semibold transition-all ${roleModal?.role === 'organizer' ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-muted hover:border-white/20 hover:text-white'}`}>
              Organizer
              <p className="text-xs font-normal text-muted mt-1">Create and manage tournaments</p>
            </button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setRoleModal(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Moderator Permissions Modal */}
      <Modal open={!!modModal} onClose={() => setModModal(null)} title={`Moderator Permissions — ${modModal?.username}`}>
        <div className="space-y-4">
          <p className="text-xs text-muted">Toggle which sections this user can moderate. Removing all permissions will revoke their moderator role.</p>
          <div className="space-y-3">
            {MOD_PERMISSIONS.map(p => (
              <label key={p.key} className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox"
                  checked={!!modPerms[p.key]}
                  onChange={e => setModPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 accent-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">{p.label}</p>
                  <p className="text-xs text-muted">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>
          {modModal?.is_moderator && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs text-purple-300">
              This user is currently a moderator. Unchecking all permissions will remove their moderator status.
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setModModal(null)}>Cancel</Button>
            <Button className="flex-1" loading={actionLoading === modModal?.id} onClick={() => saveModerator(modModal)}>
              Save Permissions
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Approve Confirmation */}
      <Modal open={bulkConfirm} onClose={() => setBulkConfirm(false)} title="Bulk Approve Organizers">
        <div className="space-y-4">
          <div className="bg-surface2 rounded-xl p-4 text-sm space-y-2">
            <p className="text-white">This will approve <span className="text-accent font-bold">{pendingOrganizers.length}</span> pending organizer account{pendingOrganizers.length !== 1 ? 's' : ''}.</p>
            <p className="text-muted text-xs">Only organizer accounts are bulk-approved here. Pending players must be approved individually.</p>
          </div>
          {pendingOrganizers.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-2">
              {pendingOrganizers.map(u => (
                <div key={u.id} className="flex items-center gap-2 text-sm">
                  <Avatar user={u} size={24} showName />
                  <span className="text-muted text-xs">{u.email}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setBulkConfirm(false)}>Cancel</Button>
            <Button className="flex-1" onClick={bulkApproveOrganizers} disabled={pendingOrganizers.length === 0}>
              Approve {pendingOrganizers.length} Organizer{pendingOrganizers.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Promo TC Modal */}
      <Modal open={promoModal} onClose={() => setPromoModal(false)} title="Send Promo TC">
        <div className="space-y-4">
          <p className="text-sm text-muted">Grant TC to a group of users at once. Each user receives the same amount. This is recorded as an admin grant transaction.</p>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-white/80">Target Group</label>
            <select value={promoTarget} onChange={e => setPromoTarget(e.target.value)}
              className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              {PROMO_TARGETS.filter(t => t.value !== 'single').map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <Input label="TC Amount per user" type="number" min="1" placeholder="e.g. 50"
            value={promoAmount} onChange={e => setPromoAmount(e.target.value)} />
          <Input label="Promo Description (shown in transaction history)" placeholder="e.g. Welcome bonus, Platform launch promo..."
            value={promoReason} onChange={e => setPromoReason(e.target.value)} />
          {promoAmount && parseInt(promoAmount) > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-white/80">
              Each eligible user will receive <span className="text-accent font-bold">{formatTC(parseInt(promoAmount))}</span>.
              This will be credited to their wallet and appear in their transaction history.
            </div>
          )}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
            This action cannot be undone. Make sure the amount and target are correct before sending.
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setPromoModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={promoLoading} onClick={sendPromo}>
              Send Promo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Award / Revoke Badge Modal */}
      <Modal open={!!badgeModal} onClose={() => setBadgeModal(null)} title={`Badges — ${badgeModal?.username}`} size="lg">
        <div className="space-y-3">
          <p className="text-xs text-muted">Click a badge to award or revoke it. Changes take effect immediately.</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {allBadges.map(b => {
              const has = userBadges.includes(b.type)
              return (
                <button key={b.type} onClick={() => awardBadge(b)} disabled={badgeLoading}
                  className={`p-3 rounded-xl border text-center transition-all hover:scale-105 ${has ? (b.rare ? 'border-amber-500/60 bg-amber-500/15' : 'border-primary/40 bg-primary/10') : 'border-white/[0.06] bg-surface opacity-50 hover:opacity-80'}`}>
                  <div className="flex justify-center mb-1">
                    {b.icon?.startsWith('http')
                      ? <img src={b.icon} alt={b.name} className="w-8 h-8 rounded-full object-cover" />
                      : <span className="text-2xl">{b.icon}</span>}
                  </div>
                  <p className="text-xs font-bold text-white leading-tight">{b.name}</p>
                  {has && <p className="text-[10px] text-green-400 mt-0.5">Earned</p>}
                </button>
              )
            })}
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setBadgeModal(null)}>Done</Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
