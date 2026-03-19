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
import { Users, Link as LinkIcon, Info, Coins, Trophy } from 'lucide-react'
import { formatTC } from '../../lib/utils'

// Platform takes 10% of the coin pool
const POOL_COMMISSION = 0.10

export default function CreateCasualGame() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    gameName: '',
    description: '',
    maxParticipants: 8,
    startTime: '',
    hasCoinPool: false,
    stakePerPlayer: 10,
  })
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(null) // { id, link, stakePerPlayer, hasCoinPool }

  function set(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })) }
  function setNum(k) { return e => setForm(p => ({ ...p, [k]: Number(e.target.value) })) }

  const stake = Number(form.stakePerPlayer) || 0
  const maxP = Number(form.maxParticipants) || 2
  const grossPool = stake * maxP
  const commission = Math.ceil(grossPool * POOL_COMMISSION)
  const winnerPrize = grossPool - commission

  async function handleCreate() {
    if (!form.title.trim() || !form.gameName) {
      toast.error('Please fill required fields')
      return
    }
    if (form.hasCoinPool && stake < 1) {
      toast.error('Stake must be at least 1 TC')
      return
    }
    // Creator must have enough to cover their own stake
    if (form.hasCoinPool && (profile.coin_balance ?? 0) < stake) {
      toast.error(`You need at least ${formatTC(stake)} to create this pool game`)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.from('tournaments').insert({
        organizer_id: profile.id,
        title: form.title,
        game_name: form.gameName,
        description: form.description || 'Casual game with friends',
        max_participants: maxP,
        start_date: form.startTime || new Date(Date.now() + 3600000).toISOString(),
        is_casual: true,
        is_public: false,
        requires_approval: false,
        approval_status: 'approved',
        status: 'published',
        entry_fee_tc: form.hasCoinPool ? stake : 0,
        prize_pool_tc: 0, // grows as players join
        format: 'custom',
        mode: 'solo',
        // store commission rate in rules field as metadata
        rules: form.hasCoinPool ? `POOL_GAME|commission=${POOL_COMMISSION}` : null,
      }).select().single()

      if (error) throw error

      // Creator auto-joins and pays stake
      if (form.hasCoinPool) {
        await supabase.from('participants').insert({
          tournament_id: data.id,
          user_id: profile.id,
          status: 'registered',
        })
        await supabase.rpc('debit_coins', {
          p_user_id: profile.id,
          p_amount: stake,
          p_type: 'entry_fee',
          p_description: `Pool stake: ${form.title}`,
          p_tournament_id: data.id,
        })
        await supabase.from('tournaments').update({
          prize_pool_tc: stake,
          current_participants: 1,
        }).eq('id', data.id)
        await refreshProfile()
      }

      const link = `${window.location.origin}/tournament/${data.id}`
      setCreated({ id: data.id, link, stakePerPlayer: stake, hasCoinPool: form.hasCoinPool })
      toast.success('Game created!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    return (
      <PageWrapper className="max-w-2xl">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="text-green-400" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Game Created!</h2>
          <p className="text-muted mb-4">Share this link with your friends</p>

          {created.hasCoinPool && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-5 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Stake per player</span>
                <span className="text-white font-bold">{formatTC(created.stakePerPlayer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Platform fee (10%)</span>
                <span className="text-muted">{formatTC(Math.ceil(created.stakePerPlayer * maxP * POOL_COMMISSION))}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                <span className="text-muted">Winner gets (if full)</span>
                <span className="text-accent font-bold">{formatTC(winnerPrize)}</span>
              </div>
            </div>
          )}

          <div className="bg-surface2 rounded-lg p-4 mb-6">
            <p className="text-sm text-white break-all">{created.link}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => { navigator.clipboard.writeText(created.link); toast.success('Link copied!') }} variant="accent" className="flex-1">
              Copy Link
            </Button>
            <Button onClick={() => navigate(`/tournament/${created.id}`)} variant="secondary" className="flex-1">
              View Game
            </Button>
          </div>
        </Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="max-w-2xl">
      <h1 className="text-3xl font-black text-white mb-2">Create Casual Game</h1>
      <p className="text-muted mb-6">Quick game setup for playing with friends</p>

      {/* Info card */}
      <Card className="p-4 mb-6 border-blue-500/30 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• Created instantly (no approval needed)</li>
            <li>• Private only — share link with friends</li>
            <li>• Not shown in public discover page</li>
            <li>• Optional coin pool — winner takes the pot</li>
          </ul>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <Input label="Game Title" required placeholder="e.g. Friday Night FIFA"
            value={form.title} onChange={set('title')} />

          <Select label="Game" required value={form.gameName} onChange={set('gameName')}>
            <option value="">Select game</option>
            {GAMES.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
          </Select>

          <Textarea label="Description (Optional)" placeholder="Any special rules or notes..."
            value={form.description} onChange={set('description')} rows={2} />

          <Input label="Max Players" type="number" min={2} max={64}
            value={form.maxParticipants} onChange={setNum('maxParticipants')} />

          <Input label="Start Time (Optional)" type="datetime-local"
            value={form.startTime} onChange={set('startTime')} />

          {/* Coin Pool Toggle */}
          <div className="border border-white/10 rounded-xl p-4 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Coins className="text-accent" size={20} />
                <div>
                  <p className="text-sm font-bold text-white">Coin Pool</p>
                  <p className="text-xs text-muted">Each player stakes TC — winner takes the pot</p>
                </div>
              </div>
              <div
                onClick={() => setForm(p => ({ ...p, hasCoinPool: !p.hasCoinPool }))}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${form.hasCoinPool ? 'bg-primary' : 'bg-surface2'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.hasCoinPool ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </label>

            {form.hasCoinPool && (
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <Input
                  label="Stake per Player (TC)"
                  type="number"
                  min={1}
                  value={form.stakePerPlayer}
                  onChange={setNum('stakePerPlayer')}
                />

                {/* Pool breakdown */}
                <div className="bg-surface2 rounded-lg p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-muted">
                    <span>Gross pool ({maxP} players × {formatTC(stake)})</span>
                    <span className="text-white">{formatTC(grossPool)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Platform fee (10%)</span>
                    <span className="text-red-400">−{formatTC(commission)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-white/10 pt-1.5">
                    <span className="text-white flex items-center gap-1"><Trophy size={12} /> Winner gets</span>
                    <span className="text-accent">{formatTC(winnerPrize)}</span>
                  </div>
                </div>

                <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                  You (the creator) will be auto-joined and your stake of {formatTC(stake)} will be deducted now.
                  The winner is declared by you from the game page.
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-muted">Your balance</span>
                  <span className={`font-bold ${(profile?.coin_balance ?? 0) >= stake ? 'text-green-400' : 'text-red-400'}`}>
                    {formatTC(profile?.coin_balance ?? 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleCreate} loading={loading} className="w-full" size="lg">
            {form.hasCoinPool ? `Create Pool Game — stake ${formatTC(stake)}` : 'Create Game'}
          </Button>
        </div>
      </Card>
    </PageWrapper>
  )
}
