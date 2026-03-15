import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatTC } from '../../lib/utils'

export default function Analytics() {
  const { profile } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase.from('tournaments').select('*').eq('organizer_id', profile.id)
    setTournaments(data ?? [])
    setLoading(false)
  }

  const totalParticipants = tournaments.reduce((s, t) => s + (t.current_participants ?? 0), 0)
  const totalEarned = tournaments.reduce((s, t) => s + (t.organizer_earnings_tc ?? 0), 0)
  const totalFees = tournaments.filter(t => t.platform_fee_paid).length * 5

  const top5 = [...tournaments].sort((a, b) => (b.current_participants ?? 0) - (a.current_participants ?? 0)).slice(0, 5)

  const monthlyData = tournaments.reduce((acc, t) => {
    const month = new Date(t.created_at).toLocaleString('default', { month: 'short', year: '2-digit' })
    const existing = acc.find(a => a.month === month)
    if (existing) { existing.count++; existing.earned += t.organizer_earnings_tc ?? 0 }
    else acc.push({ month, count: 1, earned: t.organizer_earnings_tc ?? 0 })
    return acc
  }, []).slice(-6)

  if (loading) return <PageWrapper><div className="space-y-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}</div></PageWrapper>

  return (
    <PageWrapper>
      <h1 className="text-3xl font-black text-white mb-8">📊 Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '🎪', label: 'Total Tournaments', value: tournaments.length },
          { icon: '👥', label: 'Total Participants', value: totalParticipants },
          { icon: '🪙', label: 'TC Earned', value: formatTC(totalEarned) },
          { icon: '💸', label: 'Fees Paid', value: formatTC(totalFees) },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-black text-white">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </Card>
        ))}
      </div>

      {monthlyData.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Monthly Activity</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#7C3AED" radius={[4,4,0,0]} name="Tournaments" />
              <Bar dataKey="earned" fill="#F59E0B" radius={[4,4,0,0]} name="TC Earned" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {top5.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">Top 5 Tournaments by Participants</h2>
          <div className="space-y-3">
            {top5.map((t, i) => (
              <div key={t.id} className="flex items-center gap-4">
                <span className="text-muted text-sm w-4">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="text-xs text-muted">{t.game_name}</p>
                </div>
                <span className="text-sm text-white font-bold">{t.current_participants}/{t.max_participants}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageWrapper>
  )
}
