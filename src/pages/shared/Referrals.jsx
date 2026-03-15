import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, formatDate, getCountryFlag, timeAgo } from '../../lib/utils'
import { STATUS_COLORS, VIP_TIERS, getVipTier, getReferralBonusRate } from '../../lib/constants'
import { getTopReferrers } from '../../lib/referrals'
import toast from 'react-hot-toast'

function VipBadge({ tier }) {
  if (!tier) return null
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${tier.badge}`}>
      {tier.icon} {tier.label}
    </span>
  )
}

function ProgressToNextTier({ lifetimeTc }) {
  const current = getVipTier(lifetimeTc)
  const currentIdx = current ? VIP_TIERS.findIndex(t => t.tier === current.tier) : VIP_TIERS.length
  const next = currentIdx > 0 ? VIP_TIERS[currentIdx - 1] : null

  if (!next) {
    return (
      <div className="text-center py-2">
        <span className="text-xs text-cyan-300 font-semibold">Max tier reached — Diamond</span>
      </div>
    )
  }

  const prevMin = current?.minTc ?? 0
  const progress = Math.min(100, ((lifetimeTc - prevMin) / (next.minTc - prevMin)) * 100)
  const remaining = next.minTc - lifetimeTc

  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>{current ? `${current.icon} ${current.label}` : 'No tier'}</span>
        <span>{next.icon} {next.label} in {formatTC(remaining)}</span>
      </div>
      <div className="h-2 bg-surface2 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-muted mt-1">{formatTC(lifetimeTc)} / {formatTC(next.minTc)} TC purchased lifetime</p>
    </div>
  )
}

function ExpiryCountdown({ expiresAt }) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) { setLabel('Expired'); return }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      if (days > 0) setLabel(`${days}d ${hours}h left`)
      else setLabel(`${hours}h left`)
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [expiresAt])
  const isUrgent = new Date(expiresAt) - new Date() < 3 * 24 * 60 * 60 * 1000
  return <span className={`text-xs font-semibold ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>{label}</span>
}

export default function Referrals() {
  const { profile } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [topReferrers, setTopReferrers] = useState([])
  const [lifetimeTc, setLifetimeTc] = useState(0)
  const [stats, setStats] = useState({ total: 0, active: 0, earned: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('my')
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: refs }, { data: txData }, topList] = await Promise.all([
      supabase.from('referrals')
        .select('*, referred:referred_id(id, username, avatar_url, country, is_verified)')
        .eq('referrer_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('coin_transactions')
        .select('amount_tc')
        .eq('user_id', profile.id)
        .eq('type', 'purchase')
        .eq('status', 'confirmed'),
      getTopReferrers(20),
    ])

    const lifetime = txData?.reduce((s, t) => s + (t.amount_tc ?? 0), 0) ?? 0
    setLifetimeTc(lifetime)
    setReferrals(refs ?? [])
    setTopReferrers(topList)

    const total   = refs?.length ?? 0
    const active  = refs?.filter(r => r.status === 'active').length ?? 0
    const pending = refs?.filter(r => r.status === 'pending').length ?? 0
    const earned  = refs?.reduce((s, r) => s + (r.total_tc_earned ?? 0), 0) ?? 0
    setStats({ total, active, earned, pending })
    setLoading(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(profile?.referral_code ?? '')
    setCopied(true)
    toast.success('Referral code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    const link = `${window.location.origin}/signup?ref=${profile?.referral_code}`
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied!')
  }

  const vipTier = getVipTier(lifetimeTc)
  const bonusRate = getReferralBonusRate(lifetimeTc)

  return (
    <PageWrapper>
      <h1 className="text-3xl font-black text-white mb-6">Referrals</h1>

      {/* VIP Status Card */}
      <Card className={`p-5 mb-6 border ${vipTier ? vipTier.bg : 'border-white/10'}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-white">Your VIP Status</p>
              <VipBadge tier={vipTier} />
            </div>
            <p className="text-xs text-muted mb-3">
              Your referral bonus rate: <span className={`font-bold ${vipTier ? vipTier.color : 'text-white'}`}>{Math.round(bonusRate * 100)}%</span>
              {vipTier && <span className="text-muted"> (base 3% + VIP boost)</span>}
            </p>
            {vipTier && (
              <div className="flex flex-wrap gap-1.5">
                {vipTier.benefits.map(b => (
                  <span key={b} className={`text-xs px-2 py-0.5 rounded-full border ${vipTier.badge}`}>{b}</span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Lifetime TC purchased</p>
            <p className={`text-xl font-black ${vipTier ? vipTier.color : 'text-white'}`}>{formatTC(lifetimeTc)}</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressToNextTier lifetimeTc={lifetimeTc} />
        </div>
      </Card>

      {/* VIP Tiers Overview */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {[...VIP_TIERS].reverse().map(t => (
          <div key={t.tier} className={`p-3 rounded-xl border text-center transition-all ${vipTier?.tier === t.tier ? t.bg + ' scale-105' : 'border-white/[0.06] bg-surface opacity-60'}`}>
            <div className="text-xl mb-1">{t.icon}</div>
            <p className={`text-xs font-bold ${t.color}`}>{t.label}</p>
            <p className="text-[10px] text-muted mt-0.5">{formatTC(t.minTc)}+</p>
            <p className={`text-[10px] font-semibold mt-1 ${t.color}`}>{Math.round(t.referralBonus * 100)}% ref</p>
          </div>
        ))}
      </div>

      {/* Referral Code */}
      <Card className="p-5 mb-6 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
        <p className="text-muted text-sm mb-2">Your Referral Code</p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 bg-surface2 border border-white/10 rounded-xl px-6 py-4 text-center">
            <span className="text-3xl font-black text-accent tracking-widest">{profile?.referral_code}</span>
          </div>
          <button onClick={copyCode} className="p-4 bg-primary rounded-xl hover:bg-purple-500 transition-colors">
            {copied ? <Check size={20} className="text-white" /> : <Copy size={20} className="text-white" />}
          </button>
        </div>
        <button onClick={copyLink} className="w-full text-xs text-muted hover:text-white bg-surface2 rounded-lg py-2 transition-colors">
          Copy referral link
        </button>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Referred',  value: stats.total },
          { label: 'Active',          value: stats.active,  color: 'text-green-400' },
          { label: 'Pending',         value: stats.pending, color: 'text-amber-400' },
          { label: 'TC Earned',       value: formatTC(stats.earned), color: 'text-accent' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <div className={`text-xl font-black ${s.color ?? 'text-white'}`}>{s.value}</div>
            <div className="text-xs text-muted mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.08] mb-6">
        {[['my', 'My Referrals'], ['leaderboard', 'Top Referrers'], ['how', 'How It Works']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === key ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* My Referrals */}
      {tab === 'my' && (
        <Card>
          <div className="p-4 border-b border-white/[0.06]">
            <h2 className="text-base font-bold text-white">Your Referrals</h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12 text-muted">No referrals yet. Share your code!</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 hover:bg-surface2 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar user={r.referred} size={36} showName />
                    <span className="text-xs text-muted">{getCountryFlag(r.referred?.country)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm flex-wrap justify-end">
                    <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? 'bg-gray-600 text-gray-200'}`}>
                      {r.status}
                    </span>
                    {r.status === 'active' && r.expires_at && <ExpiryCountdown expiresAt={r.expires_at} />}
                    <span className="text-accent font-bold text-xs">{formatTC(r.total_tc_earned ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {stats.earned > 0 && (
            <div className="p-4 border-t border-white/[0.06] flex justify-between items-center">
              <span className="text-muted text-sm">Lifetime referral earnings</span>
              <span className="text-accent font-black text-lg">{formatTC(stats.earned)}</span>
            </div>
          )}
        </Card>
      )}

      {/* Top Referrers Leaderboard */}
      {tab === 'leaderboard' && (
        <Card>
          <div className="p-4 border-b border-white/[0.06]">
            <h2 className="text-base font-bold text-white">Top Referrers</h2>
            <p className="text-xs text-muted mt-0.5">Ranked by total TC earned from referrals</p>
          </div>
          {topReferrers.length === 0 ? (
            <div className="text-center py-12 text-muted">No referral data yet</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {topReferrers.map((r, i) => {
                const isMe = r.referrer_id === profile.id
                return (
                  <div key={r.referrer_id} className={`flex items-center gap-4 p-4 hover:bg-surface2 transition-colors ${isMe ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-600 text-white' : 'bg-surface2 text-muted'}`}>
                      {i + 1}
                    </div>
                    <Avatar user={{ username: r.username, avatar_url: r.avatar_url, is_verified: r.is_verified }} size={36} showName />
                    <span className="text-xs text-muted">{getCountryFlag(r.country)}</span>
                    <div className="flex-1" />
                    <div className="text-right">
                      <p className="text-accent font-black text-sm">{formatTC(r.total_earned)}</p>
                      <p className="text-xs text-muted">{r.active_count} active · {r.total_count} total</p>
                    </div>
                    {isMe && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">You</span>}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* How It Works */}
      {tab === 'how' && (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">How Referrals Work</h2>
          <div className="space-y-4 mb-6">
            {[
              { step: '1', text: 'Share your referral code or link with friends' },
              { step: '2', text: 'Friend signs up using your code' },
              { step: '3', text: 'Referral activates after they complete their first tournament' },
              { step: '4', text: `Earn ${Math.round(bonusRate * 100)}% of every coin purchase they make for 30 days` },
              { step: '5', text: 'Upgrade your VIP tier to earn a higher referral bonus rate' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{s.step}</div>
                <p className="text-sm text-muted">{s.text}</p>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold text-white mb-3">VIP Referral Bonus Rates</h3>
          <div className="space-y-2">
            {[...VIP_TIERS].reverse().map(t => (
              <div key={t.tier} className={`flex items-center justify-between p-3 rounded-xl border ${vipTier?.tier === t.tier ? t.bg : 'border-white/[0.06] bg-surface'}`}>
                <div className="flex items-center gap-2">
                  <span>{t.icon}</span>
                  <span className={`text-sm font-semibold ${t.color}`}>{t.label}</span>
                  <span className="text-xs text-muted">{formatTC(t.minTc)}+ lifetime</span>
                </div>
                <span className={`text-sm font-black ${t.color}`}>{Math.round(t.referralBonus * 100)}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-surface">
              <div className="flex items-center gap-2">
                <span>—</span>
                <span className="text-sm font-semibold text-muted">No tier</span>
                <span className="text-xs text-muted">0 TC</span>
              </div>
              <span className="text-sm font-black text-muted">3%</span>
            </div>
          </div>
        </Card>
      )}
    </PageWrapper>
  )
}
