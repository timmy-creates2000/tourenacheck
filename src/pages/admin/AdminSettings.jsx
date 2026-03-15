import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import toast from 'react-hot-toast'

const SETTING_KEYS = [
  { key: 'player_withdrawal_commission_pct',    label: 'Player Withdrawal Commission (%)',     type: 'number', step: '0.1',  hint: 'e.g. 5 = 5%' },
  { key: 'organizer_withdrawal_commission_pct', label: 'Organizer Withdrawal Commission (%)',  type: 'number', step: '0.1',  hint: 'e.g. 5 = 5%' },
  { key: 'practice_platform_fee_tc',            label: 'Practice Tournament Platform Fee (TC)', type: 'number', step: '1' },
  { key: 'referral_bonus_pct',                  label: 'Referral Bonus (%)',                   type: 'number', step: '0.1',  hint: 'e.g. 3 = 3%' },
  { key: 'referral_duration_days',              label: 'Referral Duration (days)',              type: 'number', step: '1' },
  { key: 'min_deposit_tc',                      label: 'Minimum Deposit (TC)',                  type: 'number', step: '1',    hint: 'Minimum coin purchase' },
  { key: 'min_withdrawal_tc',                   label: 'Minimum Withdrawal (TC)',               type: 'number', step: '1',    hint: 'Minimum withdrawal request' },
  { key: 'fraud_threshold_tc',                  label: 'Fraud Threshold (TC)',                  type: 'number', step: '100',  hint: 'Withdrawals above this need manual review' },
  { key: 'coin_gift_max_tc',                    label: 'Max Coin Gift Per Day (TC)',            type: 'number', step: '100' },
]

// Flutterwave fee settings — domestic NGN vs international
const FLW_KEYS = [
  { key: 'flw_fee_ngn_pct',           label: 'NGN Transfer Fee (%)',           step: '0.001', hint: '1.4% domestic — e.g. 0.014' },
  { key: 'flw_fee_ngn_cap',           label: 'NGN Fee Cap (Naira)',            step: '1',     hint: 'Max fee in Naira (e.g. 2000)' },
  { key: 'flw_fee_international_pct', label: 'International Transfer Fee (%)', step: '0.001', hint: '3.8% cross-border — e.g. 0.038' },
]

const RATE_KEYS = [
  { key: 'ngn_rate', label: 'NGN', symbol: 'NGN' },
  { key: 'usd_rate', label: 'USD', symbol: 'USD' },
  { key: 'kes_rate', label: 'KES', symbol: 'KES' },
  { key: 'ghs_rate', label: 'GHS', symbol: 'GHS' },
]

export default function AdminSettings() {
  const { profile } = useAuth()
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('platform_settings').select('key, value').then(({ data }) => {
      const map = {}
      ;(data ?? []).forEach(r => { map[r.key] = r.value })
      setValues(map)
      setLoading(false)
    })
  }, [])

  function set(key, val) { setValues(p => ({ ...p, [key]: val })) }

  async function save() {
    setSaving(true)
    try {
      const upserts = Object.entries(values).map(([key, value]) => ({
        key, value: String(value), updated_at: new Date().toISOString(), updated_by: profile.id,
      }))
      const { error } = await supabase.from('platform_settings').upsert(upserts, { onConflict: 'key' })
      if (error) throw error
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageWrapper className="max-w-2xl"><div className="text-muted text-sm">Loading settings...</div></PageWrapper>

  return (
    <PageWrapper className="max-w-2xl">
      <h1 className="text-3xl font-black text-white mb-8">Admin Settings</h1>

      {/* TC Exchange Rates */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-1">TC Exchange Rates</h2>
        <p className="text-xs text-muted mb-4">1 TC = X units of each currency. Used for fiat conversion in withdrawals and purchases.</p>
        <div className="space-y-3">
          {RATE_KEYS.map(r => (
            <div key={r.key} className="flex items-center gap-4">
              <span className="text-sm font-semibold text-white w-12">{r.label}</span>
              <span className="text-xs text-muted">1 TC =</span>
              <Input type="number" step="0.001" min="0" value={values[r.key] ?? ''} onChange={e => set(r.key, e.target.value)} className="w-32" />
              <span className="text-xs text-muted">{r.symbol}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Flutterwave Fees */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-1">Flutterwave Transfer Fees</h2>
        <p className="text-xs text-muted mb-1">
          These are what Flutterwave charges Tourena per payout. Domestic (NGN) = 1.4% capped at ₦2,000.
          International (USD/GBP/EUR) = 3.8%. Tracked in revenue to show your true net profit.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 mb-4">
          Flutterwave fees are deducted from Tourena's float — not from the user's withdrawal amount.
          The revenue dashboard shows gross float, Flutterwave fees, and your net profit separately.
        </div>
        <div className="space-y-4">
          {FLW_KEYS.map(s => (
            <div key={s.key}>
              <Input label={s.label} type="number" step={s.step} min="0"
                value={values[s.key] ?? ''} onChange={e => set(s.key, e.target.value)} />
              {s.hint && <p className="text-xs text-muted mt-1">{s.hint}</p>}
            </div>
          ))}
        </div>
      </Card>

      {/* Commission, Fees & Limits */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-1">Commission, Fees & Limits</h2>
        <p className="text-xs text-muted mb-4">Platform revenue and safety settings</p>
        <div className="space-y-4">
          {SETTING_KEYS.map(s => (
            <div key={s.key}>
              <Input label={s.label} type={s.type} step={s.step ?? '1'} min="0"
                value={values[s.key] ?? ''} onChange={e => set(s.key, e.target.value)} />
              {s.hint && <p className="text-xs text-muted mt-1">{s.hint}</p>}
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-xs text-amber-300">
        Changes only affect new transactions. Existing transactions are not retroactively updated.
      </div>

      <Button onClick={save} loading={saving} className="w-full" size="lg">Save Settings</Button>
    </PageWrapper>
  )
}
