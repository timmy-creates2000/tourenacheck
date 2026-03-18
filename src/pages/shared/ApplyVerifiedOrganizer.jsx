import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Textarea } from '../../components/ui/Input'
import toast from 'react-hot-toast'
import { Award, TrendingUp, Shield } from 'lucide-react'

export default function ApplyVerifiedOrganizer() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [form, setForm] = useState({
    businessInfo: '',
    portfolioUrl: '',
    motivation: '',
    agreedToTerms: false
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!profile?.is_host) {
      toast.error('You must be a host to apply for verified organizer status')
      navigate('/profile/settings')
      return
    }
    fetchHostStats()
  }, [profile])

  async function fetchHostStats() {
    // Get tournaments hosted
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('id, status, current_participants, prize_pool_tc')
      .eq('organizer_id', profile.id)

    const completed = tournaments?.filter(t => t.status === 'completed').length || 0
    const totalParticipants = tournaments?.reduce((sum, t) => sum + (t.current_participants || 0), 0) || 0
    const totalPrizePool = tournaments?.reduce((sum, t) => sum + (t.prize_pool_tc || 0), 0) || 0

    // Get reports against user
    const { count: reportCount } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('reported_user_id', profile.id)
      .eq('status', 'confirmed')

    setStats({
      tournamentsHosted: tournaments?.length || 0,
      tournamentsCompleted: completed,
      totalParticipants,
      totalPrizePool,
      reportsAgainst: reportCount || 0,
      trustScore: profile.trust_score || 0
    })
  }

  function set(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })) }

  async function handleSubmit() {
    if (!form.motivation.trim()) {
      toast.error('Please explain why you should be verified')
      return
    }
    if (!form.agreedToTerms) {
      toast.error('You must agree to the terms and conditions')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('verified_organizer_applications').insert({
        user_id: profile.id,
        current_host_stats: stats,
        business_info: form.businessInfo || null,
        portfolio_url: form.portfolioUrl || null,
        motivation: form.motivation,
        status: 'pending'
      })

      if (error) throw error

      toast.success('Application submitted! We\'ll review it within 3-5 business days.')
      navigate('/profile/settings')
    } catch (err) {
      if (err.message.includes('duplicate')) {
        toast.error('You already have a pending application')
      } else {
        toast.error(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!stats) return <PageWrapper><div className="text-center py-12 text-muted">Loading...</div></PageWrapper>

  return (
    <PageWrapper className="max-w-3xl">
      <h1 className="text-3xl font-black text-white mb-2">Apply for Verified Organizer Status</h1>
      <p className="text-muted mb-8">
        Get featured in the Verified Organizer Center and gain player trust
      </p>

      {/* Current Stats */}
      <Card className="p-6 mb-6 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-primary" size={24} />
          <h3 className="text-primary font-bold text-lg">Your Host Statistics</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-black text-white">{stats.tournamentsHosted}</p>
            <p className="text-xs text-muted">Tournaments Hosted</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{stats.tournamentsCompleted}</p>
            <p className="text-xs text-muted">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{stats.totalParticipants}</p>
            <p className="text-xs text-muted">Total Participants</p>
          </div>
          <div>
            <p className="text-2xl font-black text-accent">{stats.totalPrizePool} TC</p>
            <p className="text-xs text-muted">Total Prize Pool</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{stats.trustScore}</p>
            <p className="text-xs text-muted">Trust Score</p>
          </div>
          <div>
            <p className={`text-2xl font-black ${stats.reportsAgainst > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats.reportsAgainst}
            </p>
            <p className="text-xs text-muted">Reports Against</p>
          </div>
        </div>
      </Card>

      {/* Requirements Check */}
      <Card className="p-6 mb-6">
        <h3 className="text-white font-bold mb-4">Requirements</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {stats.tournamentsCompleted >= 5 ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
            <span className={stats.tournamentsCompleted >= 5 ? 'text-white' : 'text-muted'}>
              At least 5 completed tournaments ({stats.tournamentsCompleted}/5)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {stats.trustScore >= 30 ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
            <span className={stats.trustScore >= 30 ? 'text-white' : 'text-muted'}>
              Trust score of 30+ ({stats.trustScore}/30)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {stats.reportsAgainst === 0 ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
            <span className={stats.reportsAgainst === 0 ? 'text-white' : 'text-muted'}>
              No confirmed reports against you
            </span>
          </div>
        </div>
        {(stats.tournamentsCompleted < 5 || stats.trustScore < 30 || stats.reportsAgainst > 0) && (
          <p className="text-amber-400 text-sm mt-4">
            ⚠️ You don't meet all requirements yet. You can still apply, but approval is less likely.
          </p>
        )}
      </Card>

      {/* Benefits */}
      <Card className="p-6 mb-6 border-accent/30 bg-accent/5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="text-accent" size={24} />
          <h3 className="text-accent font-bold text-lg">Verified Organizer Benefits</h3>
        </div>
        <ul className="space-y-2 text-sm text-white/80">
          <li>✓ Featured in Verified Organizer Center (public directory)</li>
          <li>✓ Verified badge ✓ on your profile</li>
          <li>✓ Pre-approved tournaments for registered games</li>
          <li>✓ Higher trust score and visibility</li>
          <li>✓ Priority support from platform team</li>
          <li>✓ Potential for higher commission rates</li>
        </ul>
      </Card>

      {/* Application Form */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-6">Application Form</h2>

        <Input
          label="Business Information (Optional)"
          placeholder="Company name, registration number, etc."
          value={form.businessInfo}
          onChange={set('businessInfo')}
          className="mb-6"
        />

        <Input
          label="Portfolio URL (Optional)"
          placeholder="https://your-website.com or social media"
          value={form.portfolioUrl}
          onChange={set('portfolioUrl')}
          className="mb-6"
        />

        <Textarea
          label="Why should you be verified?"
          required
          placeholder="Explain your track record, commitment to fair play, and why players should trust you..."
          value={form.motivation}
          onChange={set('motivation')}
          rows={6}
          maxLength={1000}
          className="mb-6"
        />
        <p className="text-xs text-muted -mt-4 mb-6">{form.motivation.length}/1000 characters</p>

        {/* Terms */}
        <div className="flex items-start gap-3 mb-6 p-4 bg-surface2 rounded-lg">
          <input
            type="checkbox"
            id="terms"
            checked={form.agreedToTerms}
            onChange={e => setForm(p => ({ ...p, agreedToTerms: e.target.checked }))}
            className="mt-1"
          />
          <label htmlFor="terms" className="text-sm text-white/80 cursor-pointer">
            I understand and agree that:
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>• Verified status can be revoked for misconduct</li>
              <li>• I must maintain high standards of fair play</li>
              <li>• I will register all game types I want to host</li>
              <li>• Game setting changes require admin approval</li>
              <li>• I represent the platform's reputation</li>
            </ul>
          </label>
        </div>

        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!form.agreedToTerms}
          className="w-full"
          size="lg"
        >
          Submit Application
        </Button>
      </Card>
    </PageWrapper>
  )
}
