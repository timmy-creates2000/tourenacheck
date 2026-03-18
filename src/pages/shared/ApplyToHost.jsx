import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Textarea, Select } from '../../components/ui/Input'
import { GAMES } from '../../lib/games'
import toast from 'react-hot-toast'
import { AlertTriangle, Shield, CheckCircle2 } from 'lucide-react'

export default function ApplyToHost() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    gameTypes: [],
    experience: '',
    gameCredentials: '',
    motivation: '',
    agreedToTerms: false
  })
  const [loading, setLoading] = useState(false)

  function set(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })) }

  function toggleGame(game) {
    setForm(p => ({
      ...p,
      gameTypes: p.gameTypes.includes(game)
        ? p.gameTypes.filter(g => g !== game)
        : [...p.gameTypes, game]
    }))
  }

  async function handleSubmit() {
    if (form.gameTypes.length === 0) {
      toast.error('Please select at least one game type')
      return
    }
    if (!form.experience.trim() || !form.gameCredentials.trim() || !form.motivation.trim()) {
      toast.error('Please fill all required fields')
      return
    }
    if (!form.agreedToTerms) {
      toast.error('You must agree to the terms and conditions')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('host_applications').insert({
        user_id: profile.id,
        game_types: form.gameTypes,
        experience: form.experience,
        game_credentials: form.gameCredentials,
        motivation: form.motivation,
        status: 'pending'
      })

      if (error) throw error

      toast.success('Application submitted! We\'ll review it within 24-48 hours.')
      navigate('/settings')
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

  return (
    <PageWrapper className="max-w-3xl">
      <h1 className="text-3xl font-black text-white mb-2">Apply to Host Tournaments</h1>
      <p className="text-muted mb-8">
        Become a tournament host and create public tournaments for the community
      </p>

      {/* Scam Warning */}
      <Card className="p-6 mb-6 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-amber-400 font-bold text-lg mb-2">Important Warning</h3>
            <ul className="space-y-2 text-sm text-amber-200">
              <li>⚠️ Hosting tournaments involves handling real money and player trust</li>
              <li>⚠️ Fraudulent activity will result in permanent ban and legal action</li>
              <li>⚠️ All transactions are monitored, audited, and logged</li>
              <li>⚠️ You must provide valid, verifiable game credentials</li>
              <li>⚠️ False information will result in immediate rejection</li>
              <li>⚠️ Scamming players will result in criminal prosecution</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Benefits */}
      <Card className="p-6 mb-6 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-primary flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-primary font-bold text-lg mb-2">Host Benefits</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>✓ Create public tournaments visible to all players</li>
              <li>✓ Earn commission from tournament prize pools</li>
              <li>✓ Build your reputation and trust score</li>
              <li>✓ Path to becoming a Verified Organizer</li>
              <li>✓ Access to host analytics and insights</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Application Form */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-6">Application Form</h2>

        {/* Game Types */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-white mb-3">
            Which games do you want to host? <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GAMES.map(game => (
              <button
                key={game.name}
                type="button"
                onClick={() => toggleGame(game.name)}
                className={`p-3 rounded-lg border text-left text-sm transition-all ${
                  form.gameTypes.includes(game.name)
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/10 bg-surface2 text-muted hover:border-white/20'
                }`}
              >
                {game.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">Select all games you're qualified to host</p>
        </div>

        {/* Experience */}
        <Textarea
          label="Hosting Experience"
          required
          placeholder="Describe your experience hosting tournaments, managing communities, or organizing gaming events..."
          value={form.experience}
          onChange={set('experience')}
          rows={4}
          maxLength={500}
          className="mb-6"
        />
        <p className="text-xs text-muted -mt-4 mb-6">{form.experience.length}/500 characters</p>

        {/* Game Credentials */}
        <Textarea
          label="Game Credentials"
          required
          placeholder="Provide your in-game IDs, usernames, ranks, or any credentials that verify your expertise in the games you selected..."
          value={form.gameCredentials}
          onChange={set('gameCredentials')}
          rows={4}
          maxLength={500}
          className="mb-6"
        />
        <p className="text-xs text-muted -mt-4 mb-6">{form.gameCredentials.length}/500 characters</p>

        {/* Motivation */}
        <Textarea
          label="Why do you want to host tournaments?"
          required
          placeholder="Tell us your motivation for becoming a tournament host..."
          value={form.motivation}
          onChange={set('motivation')}
          rows={4}
          maxLength={500}
          className="mb-6"
        />
        <p className="text-xs text-muted -mt-4 mb-6">{form.motivation.length}/500 characters</p>

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
              <li>• All information provided is accurate and verifiable</li>
              <li>• I will follow all platform rules and guidelines</li>
              <li>• Fraudulent activity will result in permanent ban</li>
              <li>• My tournaments will be reviewed before going live</li>
              <li>• I am responsible for fair play and dispute resolution</li>
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

      {/* What Happens Next */}
      <Card className="p-6 border-white/5">
        <h3 className="text-white font-bold mb-3">What happens next?</h3>
        <ol className="space-y-2 text-sm text-muted">
          <li>1. Our team reviews your application (24-48 hours)</li>
          <li>2. We may verify your game credentials</li>
          <li>3. You'll receive an email with the decision</li>
          <li>4. If approved, you can start creating tournaments!</li>
          <li>5. Your first few tournaments will require manual approval</li>
          <li>6. Build trust to become a Verified Organizer</li>
        </ol>
      </Card>
    </PageWrapper>
  )
}
