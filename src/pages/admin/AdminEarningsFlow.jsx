/**
 * AdminEarningsFlow.jsx
 * Full money lifecycle breakdown for platform admins.
 * Shows every naira in, every naira out, every fee, and what remains.
 *
 * Flow:
 * 1. Player deposits fiat → Flutterwave takes deposit fee → Tourena receives net fiat → TC credited
 * 2. Entry fees collected in TC → Prize pool paid out → Tourena keeps spread (commission)
 * 3. Practice tournament fees (flat 5 TC per practice)
 * 4. Referral bonuses paid (3–8% of TC purchases based on VIP tier)
 * 5. Player withdraws → Tourena takes 5% commission → Flutterwave takes transfer fee → Player receives net
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatTC, formatFiat, timeAgo } from '../../lib/utils'
import { FLW_FEES, calcFlwFee, WITHDRAWAL_COMMISSION, PLATFORM_FEE_TC } from '../../lib/constants'
import toast from 'react-hot-toast'

const CURRENCY = 'NGN'

// A single waterfall step row
function FlowStep({ step, label, value, sub, pct, color = 'text-white', arrow = true, highlight }) {
  return (
    <div className={`relative ${highlight ? 'bg-accent/5 border border-accent/20 rounded-xl' : ''}`}>
      <div className="flex items-center gap-4 p-4">
        {/* Step number */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${highlight ? 'bg-accent text-white' : 'bg-surface2 text-muted'}`}>
          {step}
        </div>
        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{label}</p>
          {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
        {/* Value + pct */}
        <div className="text-right flex-shrink-0">
          <p className={`text-base font-black ${color}`}>{value}</p>
          {pct !== undefined && (
            <p className="text-xs text-muted mt-0.5">{pct >= 0 ? '+' : ''}{pct.toFixed(1)}% of gross</p>
          )}
        </div>
      </div>
      {/* Arrow connector */}
      {arrow && (
        <div className="flex justify-center -my-1 z-10 relative">
          <div className="w-px h-4 bg-white/10" />
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mt-8 mb-3">
      <p className="text-xs font-semibold text-muted uppercase tracking-widest">{title}</p>
      {sub && <p className="text-xs text-muted/60 mt-0.5">{sub}</p>}
    </div>
  )
}

function PctBar({ pct, color = 'bg-accent' }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="w-full h-1.5 bg-surface2 rounded-full overflow-hidden mt-2">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

export default function AdminEarningsFlow() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const channelRef = useRef(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      // 1. All confirmed coin purchases
      const { data: purchases, error: e1 } = await supabase
        .from('coin_transactions')
        .select('id, amount_tc, amount_fiat, currency, created_at')
        .eq('type', 'purchase')
        .eq('status', 'confirmed')
      if (e1) throw e1

      // 2. All completed withdrawals
      const { data: withdrawals, error: e2 } = await supabase
        .from('withdrawals')
        .select('id, gross_fiat, net_fiat, commission_tc, flutterwave_transfer_fee_fiat, currency, status, created_at')
        .in('status', ['completed', 'processed'])
      if (e2) throw e2

      // 3. Platform revenue breakdown
      const { data: revenue, error: e3 } = await supabase
        .from('platform_revenue')
        .select('id, revenue_type, amount_tc, amount_fiat, created_at')
      if (e3) throw e3

      // 4. Referral bonuses paid
      const { data: referralTx, error: e4 } = await supabase
        .from('coin_transactions')
        .select('id, amount_tc, created_at')
        .eq('type', 'referral_bonus')
      if (e4) throw e4

      // 5. Entry fees collected
      const { data: entryFees, error: e5 } = await supabase
        .from('coin_transactions')
        .select('id, amount_tc, created_at')
        .eq('type', 'entry_fee')
      if (e5) throw e5

      // 6. Prizes paid out
      const { data: prizes, error: e6 } = await supabase
        .from('coin_transactions')
        .select('id, amount_tc, created_at')
        .eq('type', 'prize')
      if (e6) throw e6

      setData({ purchases, withdrawals, revenue, referralTx, entryFees, prizes })
      setLastUpdated(new Date())
    } catch (err) {
      toast.error('Failed to load earnings flow: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime
  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase.channel('earnings-flow-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coin_transactions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_revenue' }, fetchAll)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchAll])

  // ─── Derived metrics ────────────────────────────────────────────────────
  const metrics = (() => {
    if (!data) return null
    const { purchases, withdrawals, revenue, referralTx, entryFees, prizes } = data

    // ── DEPOSIT SIDE ──
    // Gross fiat players paid (before Flutterwave deposit fee)
    // We estimate gross = net / (1 - fee_rate) since we store net fiat received
    const totalFiatReceived = purchases.reduce((s, p) => s + (p.amount_fiat ?? 0), 0)
    const totalTcSold       = purchases.reduce((s, p) => s + (p.amount_tc ?? 0), 0)

    // Estimate Flutterwave deposit fees (charged to player, not Tourena — but shown for transparency)
    // NGN: 1.4% capped ₦2,000 per transaction
    const depositFlwFees = purchases.reduce((s, p) => {
      return s + calcFlwFee(p.amount_fiat ?? 0, p.currency ?? 'NGN')
    }, 0)

    // ── IN-PLATFORM ──
    const totalEntryFees  = entryFees.reduce((s, t) => s + Math.abs(t.amount_tc ?? 0), 0)
    const totalPrizesPaid = prizes.reduce((s, t) => s + Math.abs(t.amount_tc ?? 0), 0)
    const entrySpread     = totalEntryFees - totalPrizesPaid // TC kept by Tourena from tournaments

    const practiceFees    = revenue.filter(r => r.revenue_type === 'practice_fee').reduce((s, r) => s + (r.amount_tc ?? 0), 0)
    const referralBonuses = referralTx.reduce((s, t) => s + Math.abs(t.amount_tc ?? 0), 0)

    // ── WITHDRAWAL SIDE ──
    const totalGrossFiatOut   = withdrawals.reduce((s, w) => s + (w.gross_fiat ?? w.net_fiat ?? 0), 0)
    const totalNetFiatOut     = withdrawals.reduce((s, w) => s + (w.net_fiat ?? 0), 0)
    const totalWithdrawFlwFees = withdrawals.reduce((s, w) => s + (w.flutterwave_transfer_fee_fiat ?? 0), 0)
    const totalCommissionTc   = withdrawals.reduce((s, w) => s + (w.commission_tc ?? 0), 0)
    const playerComm  = revenue.filter(r => r.revenue_type === 'player_withdrawal_commission').reduce((s, r) => s + (r.amount_tc ?? 0), 0)
    const orgComm     = revenue.filter(r => r.revenue_type === 'organizer_withdrawal_commission').reduce((s, r) => s + (r.amount_tc ?? 0), 0)

    // ── FLOAT & PROFIT ──
    const grossFloat  = totalFiatReceived - totalNetFiatOut
    const netProfit   = grossFloat - totalWithdrawFlwFees
    const safeToWithdraw = netProfit * 0.6
    const reserve        = netProfit * 0.4

    // ── PERCENTAGES (of gross fiat received) ──
    const pctOf = (v) => totalFiatReceived > 0 ? (v / totalFiatReceived) * 100 : 0

    return {
      totalFiatReceived, totalTcSold, depositFlwFees,
      totalEntryFees, totalPrizesPaid, entrySpread,
      practiceFees, referralBonuses,
      totalGrossFiatOut, totalNetFiatOut, totalWithdrawFlwFees, totalCommissionTc,
      playerComm, orgComm,
      grossFloat, netProfit, safeToWithdraw, reserve,
      pctOf,
      purchaseCount: purchases.length,
      withdrawalCount: withdrawals.length,
    }
  })()

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white">Earnings Flow</h1>
          <p className="text-sm text-muted mt-1">Complete money lifecycle — every naira in, every fee, what remains</p>
          {lastUpdated && (
            <p className="text-xs text-muted mt-0.5">
              Last updated {timeAgo(lastUpdated)}
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1.5 align-middle" />
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchAll}>Refresh</Button>
      </div>

      {loading || !metrics ? (
        <div className="space-y-3 mt-6">
          {Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── LEFT COLUMN: Waterfall flow ── */}
          <div>
            {/* ── DEPOSIT SIDE ── */}
            <SectionHeader title="1. Deposit Side" sub="When a player buys TournaCoin" />
            <Card className="overflow-hidden divide-y divide-white/[0.06]">
              <FlowStep step="A" label="Player pays fiat"
                value={formatFiat(metrics.totalFiatReceived + metrics.depositFlwFees, CURRENCY)}
                sub={`${metrics.purchaseCount} purchases · gross amount before Flutterwave`}
                color="text-green-400" pct={100} />
              <FlowStep step="B" label="Flutterwave deposit fee (charged to player)"
                value={`− ${formatFiat(metrics.depositFlwFees, CURRENCY)}`}
                sub="NGN: 1.4% capped ₦2,000 · International: 3.8%"
                color="text-blue-400" pct={-metrics.pctOf(metrics.depositFlwFees)} />
              <FlowStep step="C" label="Tourena receives net fiat"
                value={formatFiat(metrics.totalFiatReceived, CURRENCY)}
                sub="Stored as float — backs TC in circulation"
                color="text-white" pct={metrics.pctOf(metrics.totalFiatReceived)} />
              <FlowStep step="D" label="TC credited to player"
                value={formatTC(metrics.totalTcSold)}
                sub="1 TC = ₦1 equivalent (at NGN rate)"
                color="text-accent" arrow={false} />
            </Card>

            {/* ── IN-PLATFORM ── */}
            <SectionHeader title="2. In-Platform Activity" sub="TC moving between players and Tourena" />
            <Card className="overflow-hidden divide-y divide-white/[0.06]">
              <FlowStep step="E" label="Entry fees collected"
                value={formatTC(metrics.totalEntryFees)}
                sub="Players pay TC to join tournaments"
                color="text-white" />
              <FlowStep step="F" label="Prize pool paid out"
                value={`− ${formatTC(metrics.totalPrizesPaid)}`}
                sub="Winners receive TC prizes"
                color="text-red-400" />
              <FlowStep step="G" label="Tournament spread (Tourena keeps)"
                value={formatTC(metrics.entrySpread)}
                sub={`Entry fees − prizes = ${metrics.totalEntryFees > 0 ? ((metrics.entrySpread / metrics.totalEntryFees) * 100).toFixed(1) : 0}% margin`}
                color="text-amber-400" />
              <FlowStep step="H" label="Practice tournament fees"
                value={formatTC(metrics.practiceFees)}
                sub={`Flat ${PLATFORM_FEE_TC} TC per practice tournament`}
                color="text-amber-400" />
              <FlowStep step="I" label="Referral bonuses paid out"
                value={`− ${formatTC(metrics.referralBonuses)}`}
                sub="3–8% of TC purchases paid to referrers (VIP tier based)"
                color="text-pink-400" arrow={false} />
            </Card>

            {/* ── WITHDRAWAL SIDE ── */}
            <SectionHeader title="3. Withdrawal Side" sub="When a player cashes out TC" />
            <Card className="overflow-hidden divide-y divide-white/[0.06]">
              <FlowStep step="J" label="Player requests withdrawal"
                value={formatFiat(metrics.totalGrossFiatOut, CURRENCY)}
                sub={`${metrics.withdrawalCount} completed withdrawals`}
                color="text-white" />
              <FlowStep step="K" label={`Tourena commission (${(WITHDRAWAL_COMMISSION * 100).toFixed(0)}%)`}
                value={`− ${formatTC(metrics.totalCommissionTc)}`}
                sub={`Player: ${formatTC(metrics.playerComm)} · Organizer: ${formatTC(metrics.orgComm)}`}
                color="text-amber-400" />
              <FlowStep step="L" label="Flutterwave transfer fee (paid by Tourena)"
                value={`− ${formatFiat(metrics.totalWithdrawFlwFees, CURRENCY)}`}
                sub="NGN: 1.4% capped ₦2,000 · International: 3.8%"
                color="text-blue-400" />
              <FlowStep step="M" label="Player receives net fiat"
                value={formatFiat(metrics.totalNetFiatOut, CURRENCY)}
                sub="After commission and Flutterwave fee"
                color="text-red-400" arrow={false} />
            </Card>
          </div>

          {/* ── RIGHT COLUMN: Summary + rates ── */}
          <div>
            {/* Net profit summary */}
            <SectionHeader title="4. What Remains" sub="Tourena's actual profit position" />
            <div className="space-y-3">
              <Card className="p-4">
                <p className="text-xs text-muted mb-1">Gross Float</p>
                <p className="text-2xl font-black text-white">{formatFiat(metrics.grossFloat, CURRENCY)}</p>
                <p className="text-xs text-muted mt-1">Fiat received − fiat paid out</p>
                <PctBar pct={metrics.pctOf(metrics.grossFloat)} color="bg-white/30" />
              </Card>
              <Card className="p-4 border-blue-500/20 bg-blue-500/5">
                <p className="text-xs text-muted mb-1">Flutterwave Fees Paid (withdrawals)</p>
                <p className="text-2xl font-black text-blue-400">− {formatFiat(metrics.totalWithdrawFlwFees, CURRENCY)}</p>
                <p className="text-xs text-muted mt-1">Transfer fees Tourena absorbs on payouts</p>
                <PctBar pct={metrics.pctOf(metrics.totalWithdrawFlwFees)} color="bg-blue-500" />
              </Card>
              <Card className="p-4 border-accent/30 bg-accent/5">
                <p className="text-xs text-muted mb-1">Net Profit</p>
                <p className={`text-2xl font-black ${metrics.netProfit >= 0 ? 'text-accent' : 'text-red-400'}`}>
                  {formatFiat(metrics.netProfit, CURRENCY)}
                </p>
                <p className="text-xs text-muted mt-1">Gross float − Flutterwave fees</p>
                <PctBar pct={metrics.pctOf(metrics.netProfit)} color="bg-accent" />
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 border-green-500/20 bg-green-500/5">
                  <p className="text-xs text-muted mb-1">Safe to Withdraw (60%)</p>
                  <p className="text-xl font-black text-green-400">{formatFiat(metrics.safeToWithdraw, CURRENCY)}</p>
                  <p className="text-xs text-muted mt-1">Your personal profit</p>
                </Card>
                <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                  <p className="text-xs text-muted mb-1">Reserve (40%)</p>
                  <p className="text-xl font-black text-amber-400">{formatFiat(metrics.reserve, CURRENCY)}</p>
                  <p className="text-xs text-muted mt-1">Keep for pending payouts</p>
                </Card>
              </div>
            </div>

            {/* TC earnings summary */}
            <SectionHeader title="5. TC Earnings Summary" sub="Tourena's TC-denominated income" />
            <Card className="divide-y divide-white/[0.06]">
              {[
                { label: 'Tournament spread', value: metrics.entrySpread, color: 'text-amber-400' },
                { label: 'Practice fees', value: metrics.practiceFees, color: 'text-amber-400' },
                { label: 'Player withdrawal commissions', value: metrics.playerComm, color: 'text-orange-400' },
                { label: 'Organizer withdrawal commissions', value: metrics.orgComm, color: 'text-orange-400' },
                { label: 'Referral bonuses paid out', value: -metrics.referralBonuses, color: 'text-pink-400' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-muted">{row.label}</p>
                  <p className={`text-sm font-bold ${row.color}`}>
                    {row.value >= 0 ? '+' : ''}{formatTC(row.value)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-accent/5">
                <p className="text-sm font-bold text-white">Net TC Earnings</p>
                <p className="text-sm font-black text-accent">
                  {formatTC(metrics.entrySpread + metrics.practiceFees + metrics.playerComm + metrics.orgComm - metrics.referralBonuses)}
                </p>
              </div>
            </Card>

            {/* Fee rate reference */}
            <SectionHeader title="6. Fee Rate Reference" />
            <Card className="divide-y divide-white/[0.06]">
              {[
                { label: 'Flutterwave NGN deposit fee', value: '1.4%', sub: 'Capped at ₦2,000 per transaction', color: 'text-blue-400' },
                { label: 'Flutterwave NGN transfer fee', value: '1.4%', sub: 'Capped at ₦2,000 per payout', color: 'text-blue-400' },
                { label: 'Flutterwave international fee', value: '3.8%', sub: 'USD / GBP / EUR transfers', color: 'text-blue-400' },
                { label: 'Tourena withdrawal commission', value: `${(WITHDRAWAL_COMMISSION * 100).toFixed(0)}%`, sub: 'Applied before Flutterwave fee', color: 'text-amber-400' },
                { label: 'Practice tournament fee', value: `${PLATFORM_FEE_TC} TC`, sub: 'Flat fee per practice entry', color: 'text-amber-400' },
                { label: 'Referral bonus (base)', value: '3%', sub: 'Up to 8% for Diamond VIP', color: 'text-pink-400' },
                { label: 'Minimum deposit', value: '10 TC', sub: '≈ ₦10 at NGN rate', color: 'text-muted' },
                { label: 'Minimum withdrawal', value: '15 TC', sub: '≈ ₦15 at NGN rate', color: 'text-muted' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-white">{row.label}</p>
                    <p className="text-xs text-muted">{row.sub}</p>
                  </div>
                  <p className={`text-sm font-bold ${row.color}`}>{row.value}</p>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
