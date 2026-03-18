import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import { SkeletonRow } from '../../components/ui/Skeleton'
import { Coins, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { formatTC, formatFiat, tcToFiat } from '../../lib/utils'

export default function AdminCoinCirculation() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCirculationStats()
  }, [])

  async function fetchCirculationStats() {
    setLoading(true)
    try {
      // Total coins in user wallets
      const { data: usersData } = await supabase
        .from('users')
        .select('coin_balance')

      const totalInWallets = usersData?.reduce((sum, u) => sum + (parseFloat(u.coin_balance) || 0), 0) || 0

      // Total coins purchased (all time)
      const { data: purchaseData } = await supabase
        .from('coin_transactions')
        .select('amount_tc, amount_fiat, currency')
        .eq('type', 'purchase')
        .eq('status', 'confirmed')

      const totalPurchased = purchaseData?.reduce((sum, t) => sum + (parseFloat(t.amount_tc) || 0), 0) || 0
      const totalRevenue = purchaseData?.reduce((sum, t) => sum + (parseFloat(t.amount_fiat) || 0), 0) || 0

      // Total coins withdrawn
      const { data: withdrawalData } = await supabase
        .from('withdrawals')
        .select('gross_tc, net_fiat, flutterwave_transfer_fee_fiat, currency')
        .in('status', ['completed', 'processed'])

      const totalWithdrawn = withdrawalData?.reduce((sum, w) => sum + (parseFloat(w.gross_tc) || 0), 0) || 0
      const totalPaidOut = withdrawalData?.reduce((sum, w) => sum + (parseFloat(w.net_fiat) || 0), 0) || 0
      const totalFlwFees = withdrawalData?.reduce((sum, w) => sum + (parseFloat(w.flutterwave_transfer_fee_fiat) || 0), 0) || 0

      // Platform earnings (from withdrawals)
      const { data: withdrawalEarnings } = await supabase
        .from('withdrawals')
        .select('tourena_commission_tc')
        .in('status', ['completed', 'processed'])

      const platformEarningsTC = withdrawalEarnings?.reduce((sum, w) => sum + (parseFloat(w.tourena_commission_tc) || 0), 0) || 0

      // Active users with balance
      const activeUsers = usersData?.filter(u => parseFloat(u.coin_balance) > 0).length || 0

      // Coins in circulation (purchased - withdrawn)
      const coinsInCirculation = totalPurchased - totalWithdrawn

      // Platform profit (revenue - payouts - flw fees)
      const platformProfit = totalRevenue - totalPaidOut - totalFlwFees

      // Average balance per active user
      const avgBalance = activeUsers > 0 ? totalInWallets / activeUsers : 0

      setStats({
        totalInWallets,
        totalPurchased,
        totalWithdrawn,
        coinsInCirculation,
        totalRevenue,
        totalPaidOut,
        totalFlwFees,
        platformProfit,
        platformEarningsTC,
        activeUsers,
        avgBalance,
        totalUsers: usersData?.length || 0
      })
    } catch (err) {
      console.error('Error fetching circulation stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <h1 className="text-3xl font-black text-white mb-8">Coin Circulation</h1>
        <Card><div className="divide-y divide-white/[0.06]">{Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)}</div></Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="flex items-center gap-3 mb-8">
        <Coins className="text-accent" size={32} />
        <h1 className="text-3xl font-black text-white">Coin Circulation</h1>
      </div>

      <p className="text-muted mb-8">
        Track total coin supply, circulation, and platform economics in real-time.
      </p>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 border-accent/30 bg-accent/5">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="text-accent" size={24} />
            <p className="text-sm text-muted">Total in Wallets</p>
          </div>
          <p className="text-3xl font-black text-white">{formatTC(stats.totalInWallets)}</p>
          <p className="text-xs text-muted mt-1">≈ {formatFiat(tcToFiat(stats.totalInWallets, 'NGN'), 'NGN')}</p>
        </Card>

        <Card className="p-6 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-400" size={24} />
            <p className="text-sm text-muted">Total Purchased</p>
          </div>
          <p className="text-3xl font-black text-white">{formatTC(stats.totalPurchased)}</p>
          <p className="text-xs text-green-400 mt-1">Revenue: {formatFiat(stats.totalRevenue, 'NGN')}</p>
        </Card>

        <Card className="p-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="text-red-400" size={24} />
            <p className="text-sm text-muted">Total Withdrawn</p>
          </div>
          <p className="text-3xl font-black text-white">{formatTC(stats.totalWithdrawn)}</p>
          <p className="text-xs text-red-400 mt-1">Paid Out: {formatFiat(stats.totalPaidOut, 'NGN')}</p>
        </Card>

        <Card className="p-6 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="text-primary" size={24} />
            <p className="text-sm text-muted">In Circulation</p>
          </div>
          <p className="text-3xl font-black text-white">{formatTC(stats.coinsInCirculation)}</p>
          <p className="text-xs text-muted mt-1">Purchased - Withdrawn</p>
        </Card>
      </div>

      {/* Platform Economics */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6">Platform Economics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Total Revenue</p>
            <p className="text-2xl font-black text-green-400">{formatFiat(stats.totalRevenue, 'NGN')}</p>
            <p className="text-xs text-muted mt-1">From coin purchases</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Total Paid Out</p>
            <p className="text-2xl font-black text-red-400">{formatFiat(stats.totalPaidOut, 'NGN')}</p>
            <p className="text-xs text-muted mt-1">Withdrawals processed</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Flutterwave Fees</p>
            <p className="text-2xl font-black text-blue-400">{formatFiat(stats.totalFlwFees, 'NGN')}</p>
            <p className="text-xs text-muted mt-1">Transfer fees paid</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Net Profit</p>
            <p className={`text-2xl font-black ${stats.platformProfit >= 0 ? 'text-accent' : 'text-red-400'}`}>{formatFiat(stats.platformProfit, 'NGN')}</p>
            <p className="text-xs text-muted mt-1">Revenue − Payouts − Fees</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
            <p className="text-xs text-muted mb-1">Safe to Withdraw (60%)</p>
            <p className="text-xl font-black text-green-400">{formatFiat(stats.platformProfit * 0.6, 'NGN')}</p>
            <p className="text-xs text-muted mt-1">Your personal profit</p>
          </div>
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-muted mb-1">Reserve Required (40%)</p>
            <p className="text-xl font-black text-amber-400">{formatFiat(stats.platformProfit * 0.4, 'NGN')}</p>
            <p className="text-xs text-muted mt-1">Keep for pending payouts</p>
          </div>
        </div>
      </Card>

      {/* User Stats */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6">User Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="text-primary" size={20} />
              <p className="text-sm text-muted">Total Users</p>
            </div>
            <p className="text-2xl font-black text-white">{stats.totalUsers.toLocaleString()}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="text-accent" size={20} />
              <p className="text-sm text-muted">Active Users</p>
            </div>
            <p className="text-2xl font-black text-white">{stats.activeUsers.toLocaleString()}</p>
            <p className="text-xs text-muted mt-1">With TC balance &gt; 0</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Coins className="text-green-400" size={20} />
              <p className="text-sm text-muted">Avg Balance</p>
            </div>
            <p className="text-2xl font-black text-white">{formatTC(stats.avgBalance)}</p>
            <p className="text-xs text-muted mt-1">Per active user</p>
          </div>
        </div>
      </Card>

      {/* Platform Earnings Breakdown */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-white mb-6">Platform Earnings Breakdown</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface2 rounded-lg">
            <div>
              <p className="text-sm text-muted">Withdrawal Commissions</p>
              <p className="text-xs text-muted mt-1">5% of all withdrawals</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-accent">{formatTC(stats.platformEarningsTC)}</p>
              <p className="text-xs text-muted">≈ {formatFiat(tcToFiat(stats.platformEarningsTC, 'NGN'), 'NGN')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface2 rounded-lg">
            <div>
              <p className="text-sm text-muted">Net Platform Profit</p>
              <p className="text-xs text-muted mt-1">Revenue - Payouts - Flutterwave Fees</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-400">{formatFiat(stats.platformProfit, 'NGN')}</p>
              <p className="text-xs text-muted">
                {stats.totalRevenue > 0 ? ((stats.platformProfit / stats.totalRevenue) * 100).toFixed(1) : '0.0'}% margin
              </p>
            </div>
          </div>
        </div>
      </Card>
    </PageWrapper>
  )
}
