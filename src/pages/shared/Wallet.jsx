import { useState, useEffect } from 'react'
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import GiftCoinModal from '../../components/ui/GiftCoinModal'
import { SkeletonRow } from '../../components/ui/Skeleton'
import { COIN_PACKAGES, TX_TYPE_COLORS, MIN_WITHDRAWAL_TC, MIN_DEPOSIT_TC, WITHDRAWAL_COMMISSION, calcFlwFee } from '../../lib/constants'
import { tcToFiat, formatFiat, formatTC, formatDateTime, uniqueRef } from '../../lib/utils'
import { FLW_PUBLIC_KEY } from '../../lib/flutterwave'
import { processReferralBonus } from '../../lib/referrals'
import { checkAndAwardBadges } from '../../lib/badges'
import toast from 'react-hot-toast'

// Inner component so useFlutterwave gets a fresh config each time Buy is clicked
function FlutterwaveButton({ profile, tcAmount, fiatAmount, currency, onSuccess }) {
  const config = {
    public_key: FLW_PUBLIC_KEY,
    tx_ref: uniqueRef(),
    amount: fiatAmount,
    currency,
    payment_options: 'card,banktransfer,ussd',
    customer: { email: profile?.email, name: profile?.username },
    customizations: {
      title: 'Tourena Coins',
      description: `Purchase ${tcAmount} TC`,
      logo: `${window.location.origin}/coin.svg`,
    },
  }
  const handleFlutterPayment = useFlutterwave(config)

  function pay() {
    handleFlutterPayment({
      callback: async (response) => {
        closePaymentModal()
        if (response.status === 'successful') {
          await onSuccess(response)
        }
      },
      onclose: () => {},
    })
  }

  return (
    <Button onClick={pay} disabled={tcAmount < MIN_DEPOSIT_TC} className="w-full" variant="accent">
      Pay {tcAmount > 0 ? formatFiat(fiatAmount, currency) : ''}
    </Button>
  )
}

export default function Wallet() {
  const { profile, refreshProfile } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(true)
  const [buyModal, setBuyModal] = useState(false)
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [giftModal, setGiftModal] = useState(false)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [customTc, setCustomTc] = useState('')
  const [txFilter, setTxFilter] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const currency = profile?.preferred_currency ?? 'NGN'

  useEffect(() => { fetchTransactions() }, [txFilter, page])

  async function fetchTransactions() {
    setTxLoading(true)
    let q = supabase.from('coin_transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (txFilter) q = q.eq('type', txFilter)
    const { data } = await q
    setTransactions(data ?? [])
    setTxLoading(false)
  }

  const tcAmount = selectedPkg?.custom ? (parseInt(customTc) || 0) : (selectedPkg?.tc ?? 0)
  const fiatAmount = tcToFiat(tcAmount, currency)

  async function onPaymentSuccess(response) {
    await supabase.rpc('credit_coins', {
      p_user_id: profile.id,
      p_amount: tcAmount,
      p_type: 'purchase',
      p_description: `Purchased ${tcAmount} TC`,
      p_fiat: fiatAmount,
      p_currency: currency,
      p_flw_ref: response.transaction_id?.toString(),
    })
    await refreshProfile()
    await processReferralBonus(profile.id, tcAmount)
    await checkAndAwardBadges(profile.id)
    toast.success(`${formatTC(tcAmount)} added to your wallet!`)
    setBuyModal(false)
    setSelectedPkg(null)
    setCustomTc('')
    fetchTransactions()
  }

  return (
    <PageWrapper>
      <h1 className="text-3xl font-black text-white mb-8">Wallet</h1>

      {/* Balance Card */}
      <Card className="p-6 mb-8 bg-gradient-to-br from-primary/20 to-accent/10 border-primary/30">
        <p className="text-muted text-sm mb-1">Your Balance</p>
        <div className="flex items-center gap-3 mb-2">
          <img src="/coin.svg" alt="TC" className="w-10 h-10" />
          <span className="text-4xl font-black text-white">{formatTC(profile?.coin_balance ?? 0)}</span>
        </div>
        <p className="text-muted text-sm mb-6">≈ {formatFiat(tcToFiat(profile?.coin_balance ?? 0, currency), currency)}</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setBuyModal(true)} variant="accent">Buy Coins</Button>
          <Button onClick={() => setWithdrawModal(true)} variant="secondary">Withdraw</Button>
          <Button onClick={() => setGiftModal(true)} variant="ghost">Gift Coins</Button>
        </div>
      </Card>

      {/* Buy Modal */}
      <Modal open={buyModal} onClose={() => setBuyModal(false)} title="Buy Tourena Coins" size="lg">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {COIN_PACKAGES.map((pkg, i) => (
            <button key={i} onClick={() => setSelectedPkg(pkg)}
              className={`p-4 rounded-xl border text-left transition-all ${selectedPkg === pkg ? 'border-accent bg-accent/10 glow-gold' : 'border-white/10 bg-surface2 hover:border-white/20'}`}>
              <div className="text-accent font-black text-lg">{pkg.custom ? 'Custom' : pkg.label}</div>
              {!pkg.custom && <div className="text-muted text-xs mt-1">{formatFiat(tcToFiat(pkg.tc, currency), currency)}</div>}
            </button>
          ))}
        </div>
        {selectedPkg?.custom && (
          <Input label={`Amount (min ${MIN_DEPOSIT_TC} TC)`} type="number" min={MIN_DEPOSIT_TC} placeholder={`Enter TC amount`} value={customTc} onChange={e => setCustomTc(e.target.value)} className="mb-4" />
        )}
        {tcAmount > 0 && (
          <div className="bg-surface2 rounded-xl p-4 mb-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted">TC Amount</span><span className="text-white font-bold">{formatTC(tcAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted">You pay</span><span className="text-accent font-bold">{formatFiat(fiatAmount, currency)}</span></div>
            <p className="text-xs text-muted pt-1">Payment processed securely via Flutterwave</p>
          </div>
        )}
        <FlutterwaveButton
          profile={profile}
          tcAmount={tcAmount}
          fiatAmount={fiatAmount}
          currency={currency}
          onSuccess={onPaymentSuccess}
        />
      </Modal>

      {/* Withdraw Modal */}
      <WithdrawModal open={withdrawModal} onClose={() => setWithdrawModal(false)} profile={profile} currency={currency} onSuccess={() => { refreshProfile(); fetchTransactions() }} />

      {/* Gift Modal */}
      {giftModal && <GiftCoinModal onClose={() => setGiftModal(false)} onSuccess={() => { refreshProfile(); fetchTransactions() }} />}

      {/* Transaction History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Transaction History</h2>
          <select value={txFilter} onChange={e => setTxFilter(e.target.value)}
            className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary">
            <option value="">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="entry_fee">Entry Fee</option>
            <option value="prize">Prize</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="referral_bonus">Referral Bonus</option>
            <option value="organizer_earnings">Organizer Earnings</option>
            <option value="refund">Refund</option>
            <option value="gift_sent">Gift Sent</option>
            <option value="gift_received">Gift Received</option>
            <option value="admin_grant">Admin Grant</option>
          </select>
        </div>

        <Card>
          {txLoading ? (
            <div className="divide-y divide-white/[0.06]">{Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted">No transactions yet</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-surface2 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TX_TYPE_COLORS[tx.type] ?? 'bg-gray-600 text-gray-200'}`}>{tx.type?.replace(/_/g, ' ')}</span>
                    <div>
                      <p className="text-sm text-white">{tx.description}</p>
                      <p className="text-xs text-muted">{formatDateTime(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${tx.amount_tc > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount_tc > 0 ? '+' : ''}{formatTC(tx.amount_tc)}
                    </p>
                    <span className={`text-xs ${tx.status === 'confirmed' ? 'text-green-400' : tx.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-between mt-4">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous</Button>
          <Button variant="ghost" size="sm" disabled={transactions.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Next →</Button>
        </div>
      </div>
    </PageWrapper>
  )
}

function WithdrawModal({ open, onClose, profile, currency, onSuccess }) {
  const [form, setForm] = useState({ amount: '', bankName: '', accountNumber: '', accountName: '' })
  const [loading, setLoading] = useState(false)

  function set(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })) }

  const grossTc = parseInt(form.amount) || 0
  const commissionTc = Math.floor(grossTc * WITHDRAWAL_COMMISSION)
  const netTc = grossTc - commissionTc
  const netFiat = tcToFiat(netTc, currency)
  const flwFee = calcFlwFee(netFiat, currency)
  const finalFiat = netFiat - flwFee

  async function handleWithdraw() {
    if (grossTc < MIN_WITHDRAWAL_TC) { toast.error(`Minimum withdrawal is ${MIN_WITHDRAWAL_TC} TC`); return }
    if (grossTc > (profile?.coin_balance ?? 0)) { toast.error('Insufficient TC balance'); return }
    if (!form.bankName || !form.accountNumber || !form.accountName) { toast.error('Please fill all bank details'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('withdrawals').insert({
        user_id: profile.id,
        withdrawal_type: profile.role === 'organizer' ? 'organizer_earnings' : 'player_prize',
        gross_tc: grossTc,
        tourena_commission_tc: commissionTc,
        net_tc: netTc,
        net_fiat: finalFiat,
        flutterwave_transfer_fee_fiat: flwFee,
        currency,
        bank_name: form.bankName,
        account_number: form.accountNumber,
        account_name: form.accountName,
        status: 'pending',
      })
      if (error) throw error
      await supabase.rpc('debit_coins', { p_user_id: profile.id, p_amount: grossTc, p_type: 'withdrawal', p_description: `Withdrawal of ${grossTc} TC` })
      toast.success('Withdrawal request submitted!')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Withdraw Coins">
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
          Minimum withdrawal: {MIN_WITHDRAWAL_TC} TC · Tourena takes {Math.round(WITHDRAWAL_COMMISSION * 100)}% commission
        </div>
        <Input label="Amount (TC)" type="number" min={MIN_WITHDRAWAL_TC} placeholder={`Min ${MIN_WITHDRAWAL_TC} TC`} value={form.amount} onChange={set('amount')} />
        {grossTc >= MIN_WITHDRAWAL_TC && (
          <div className="bg-surface2 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted">Gross TC</span><span className="text-white">{formatTC(grossTc)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Tourena {Math.round(WITHDRAWAL_COMMISSION * 100)}% commission</span><span className="text-red-400">- {formatTC(commissionTc)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Net TC value</span><span className="text-white">{formatFiat(netFiat, currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Flutterwave transfer fee</span><span className="text-red-400">- {formatFiat(flwFee, currency)}</span></div>
            <div className="flex justify-between font-bold border-t border-white/10 pt-1 mt-1"><span className="text-white">You receive</span><span className="text-accent">{formatFiat(finalFiat, currency)}</span></div>
          </div>
        )}
        <Input label="Bank Name" placeholder="e.g. GTBank" value={form.bankName} onChange={set('bankName')} />
        <Input label="Account Number" placeholder="10-digit account number" value={form.accountNumber} onChange={set('accountNumber')} />
        <Input label="Account Name" placeholder="Name on account" value={form.accountName} onChange={set('accountName')} />
        <Button onClick={handleWithdraw} loading={loading} className="w-full">Request Withdrawal</Button>
      </div>
    </Modal>
  )
}
