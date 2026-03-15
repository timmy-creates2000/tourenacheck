import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Textarea, Select } from '../../components/ui/Input'
import { TOURNAMENT_FORMATS, TOURNAMENT_MODES, GAME_TYPES, MAX_PARTICIPANTS_OPTIONS, PRIZE_DISTRIBUTIONS, CHAT_PLATFORMS, PLATFORM_FEE_TC } from '../../lib/constants'
import { GAME_NAMES } from '../../lib/games'
import { formatTC } from '../../lib/utils'
import toast from 'react-hot-toast'

const STEPS = ['Basic Info', 'Format & Mode', 'Prize & Entry', 'Review & Publish']

export default function CreateTournament() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)

  const [form, setForm] = useState({
    title: '', game_name: '', game_type: 'mobile', description: '',
    format: 'single_elimination', mode: 'solo', team_size: null, custom_mode_name: '',
    max_participants: 16, registration_deadline: '', start_date: '', end_date: '', rules: '',
    is_public: true, join_code: '', room_code: '', room_password: '', chat_group_link: '', chat_platform: '',
    entry_fee_tc: 0, prize_pool_tc: 0, prize_funded_by: 'entry_fees', prize_distribution: 'winner_all',
    prize_distribution_data: null, organizer_earnings_enabled: false,
  })

  function set(k) { return e => setForm(p => ({ ...p, [k]: e.target?.value ?? e })) }
  function setNum(k) { return e => setForm(p => ({ ...p, [k]: Number(e.target.value) })) }

  const isPractice = form.entry_fee_tc === 0 && form.prize_pool_tc === 0

  async function uploadFile(file, bucket, basePath) {
    const ext = file.name.split('.').pop()
    const path = `${basePath}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  async function handleSubmit(isDraft = false) {
    if (!form.title) { toast.error('Tournament title is required'); return }
    if (!thumbnailFile && !isDraft) { toast.error('Thumbnail is required'); return }
    if (!isPractice && form.prize_pool_tc > 0 && form.entry_fee_tc === 0 && form.prize_funded_by === 'entry_fees') {
      toast.error('Entry fee required when prize is funded by entry fees')
      return
    }
    if (!isDraft && isPractice && (profile?.coin_balance ?? 0) < PLATFORM_FEE_TC) {
      toast.error(`Insufficient TC. You need ${PLATFORM_FEE_TC} TC to publish a practice tournament.`)
      return
    }
    setSaving(true)
    try {
      let thumbnail_url = null, banner_url = null
      if (thumbnailFile) thumbnail_url = await uploadFile(thumbnailFile, 'thumbnails', `${profile.id}/${Date.now()}-thumb`)
      if (bannerFile) banner_url = await uploadFile(bannerFile, 'banners', `${profile.id}/${Date.now()}-banner`)

      const payload = {
        ...form,
        organizer_id: profile.id,
        is_practice: isPractice,
        thumbnail_url,
        banner_url,
        current_participants: 0,
        status: isDraft ? 'draft' : 'pending_review',
        platform_fee_tc: isPractice ? PLATFORM_FEE_TC : 0,
        platform_fee_paid: !isDraft && isPractice,
        room_revealed: false,
        organizer_earnings_tc: 0,
        organizer_commission_tc: 0,
      }

      const { data, error } = await supabase.from('tournaments').insert(payload).select().single()
      if (error) throw error

      if (!isDraft && isPractice) {
        await supabase.rpc('debit_coins', { p_user_id: profile.id, p_amount: PLATFORM_FEE_TC, p_type: 'practice_fee', p_description: `Practice fee for: ${form.title}`, p_tournament_id: data.id })
        await supabase.from('platform_revenue').insert({ revenue_type: 'practice_fee', amount_tc: PLATFORM_FEE_TC, amount_fiat: 0, currency: profile.preferred_currency, user_id: profile.id, tournament_id: data.id })
        await refreshProfile()
      }

      toast.success(isDraft ? 'Tournament saved as draft!' : 'Tournament submitted for review!')
      navigate(`/manage/${data.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageWrapper className="max-w-2xl">
      <h1 className="text-3xl font-black text-white mb-2">Create Tournament</h1>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? 'bg-primary text-white' : 'bg-surface2 text-muted'}`}>{i + 1}</div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-white font-semibold' : 'text-muted'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary' : 'bg-surface2'}`} />}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && <Step1 form={form} set={set} thumbnailPreview={thumbnailPreview} setThumbnailFile={setThumbnailFile} setThumbnailPreview={setThumbnailPreview} setBannerFile={setBannerFile} />}
        {step === 1 && <Step2 form={form} set={set} setNum={setNum} setForm={setForm} />}
        {step === 2 && <Step3 form={form} set={set} setNum={setNum} isPractice={isPractice} />}
        {step === 3 && <Step4 form={form} isPractice={isPractice} profile={profile} />}

        <div className="flex justify-between mt-8 pt-6 border-t border-white/[0.08]">
          <Button variant="secondary" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/my-tournaments')} disabled={saving}>
            {step === 0 ? 'Cancel' : '← Back'}
          </Button>
          <div className="flex gap-2">
            {step === 3 && <Button variant="secondary" onClick={() => handleSubmit(true)} loading={saving}>Save Draft</Button>}
            {step < 3
              ? <Button onClick={() => setStep(s => s + 1)}>Next →</Button>
              : <Button onClick={() => handleSubmit(false)} loading={saving}>
                  {isPractice ? `Submit (${PLATFORM_FEE_TC} TC fee)` : 'Submit for Review'}
                </Button>
            }
          </div>
        </div>
      </Card>
    </PageWrapper>
  )
}

function Step1({ form, set, thumbnailPreview, setThumbnailFile, setThumbnailPreview, setBannerFile }) {
  const [gameSearch, setGameSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const filteredGames = GAME_NAMES.filter(n =>
    !gameSearch || n.toLowerCase().includes(gameSearch.toLowerCase())
  ).slice(0, 60)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Basic Info</h2>
      <Input label="Tournament Title *" placeholder="e.g. Friday Night Warzone Cup" value={form.title} onChange={set('title')} />

      {/* Game Name with picker */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-white/80">Game Name *</label>
        <div className="relative">
          <input
            value={form.game_name}
            onChange={e => { set('game_name')(e); setGameSearch(e.target.value); setShowPicker(true) }}
            onFocus={() => setShowPicker(true)}
            placeholder="Type or select a game..."
            className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
          />
          {showPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-white/10 rounded-xl shadow-2xl z-20 max-h-52 overflow-y-auto">
              {filteredGames.map(name => (
                <button key={name} type="button"
                  onClick={() => { set('game_name')({ target: { value: name } }); setShowPicker(false); setGameSearch('') }}
                  className="w-full text-left px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-surface2 transition-colors">
                  {name}
                </button>
              ))}
              {filteredGames.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted">No match — your custom name will be used</div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted">Select from the list or type a custom game name</p>
      </div>

      <Select label="Game Type / Platform" value={form.game_type} onChange={set('game_type')}>
        {GAME_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
      </Select>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-white/80">Thumbnail (required) *</label>
        <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
          {thumbnailPreview ? <img src={thumbnailPreview} className="w-32 h-32 object-cover rounded-lg mx-auto mb-2" alt="thumb" /> : <div className="text-4xl mb-2">🖼️</div>}
          <label className="cursor-pointer text-sm text-primary hover:text-purple-300">
            {thumbnailPreview ? 'Change thumbnail' : 'Upload thumbnail (square)'}
            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) { setThumbnailFile(f); setThumbnailPreview(URL.createObjectURL(f)) } }} />
          </label>
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-white/80">Banner (optional)</label>
        <label className="cursor-pointer block border border-dashed border-white/10 rounded-xl p-3 text-center text-sm text-muted hover:border-primary/30 transition-colors">
          Upload banner (wide)
          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) setBannerFile(f) }} />
        </label>
      </div>
      <Textarea label="Description" placeholder="Describe your tournament..." value={form.description} onChange={set('description')} rows={4} />
    </div>
  )
}

function Step2({ form, set, setNum, setForm }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Format & Mode</h2>
      <Select label="Format" value={form.format} onChange={set('format')}>
        {TOURNAMENT_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </Select>
      <Select label="Mode" value={form.mode} onChange={set('mode')}>
        {TOURNAMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </Select>
      {form.mode === 'team' && (
        <Select label="Team Size" value={form.team_size ?? ''} onChange={e => setForm(p => ({ ...p, team_size: Number(e.target.value) }))}>
          {[2,3,4,5].map(n => <option key={n} value={n}>{n} players</option>)}
        </Select>
      )}
      {form.mode === 'custom' && <Input label="Custom Mode Name" value={form.custom_mode_name} onChange={set('custom_mode_name')} />}
      <Select label="Max Participants" value={form.max_participants} onChange={setNum('max_participants')}>
        {MAX_PARTICIPANTS_OPTIONS.map(n => <option key={n} value={n}>{n} players</option>)}
      </Select>
      <Input label="Registration Deadline" type="datetime-local" value={form.registration_deadline} onChange={set('registration_deadline')} />
      <Input label="Start Date & Time" type="datetime-local" value={form.start_date} onChange={set('start_date')} />
      <Input label="End Date" type="date" value={form.end_date} onChange={set('end_date')} />
      <Textarea label="Rules" placeholder="Tournament rules and guidelines..." value={form.rules} onChange={set('rules')} rows={5} />
      <div className="flex items-center justify-between bg-surface2 rounded-xl p-4">
        <div>
          <p className="text-sm font-semibold text-white">Visibility</p>
          <p className="text-xs text-muted">{form.is_public ? 'Public — anyone can find and join' : 'Private — join code required'}</p>
        </div>
        <button onClick={() => setForm(p => ({ ...p, is_public: !p.is_public }))}
          className={`w-12 h-6 rounded-full transition-colors ${form.is_public ? 'bg-primary' : 'bg-surface'} border border-white/10 relative`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.is_public ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {!form.is_public && <Input label="Join Code (max 10 chars)" maxLength={10} value={form.join_code} onChange={set('join_code')} />}
      <Input label="Room Code (optional)" value={form.room_code} onChange={set('room_code')} />
      <Input label="Room Password (optional)" value={form.room_password} onChange={set('room_password')} />
      <Input label="Chat Group Link (optional)" type="url" value={form.chat_group_link} onChange={set('chat_group_link')} />
      {form.chat_group_link && (
        <Select label="Chat Platform" value={form.chat_platform} onChange={set('chat_platform')}>
          <option value="">Select platform</option>
          {CHAT_PLATFORMS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
      )}
      <div className="bg-surface2 rounded-lg p-3 text-xs text-muted">ℹ️ Room code, password, and chat link are hidden from participants until you reveal them</div>
    </div>
  )
}

function Step3({ form, set, setNum, isPractice }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Prize & Entry</h2>
      <Input label="Entry Fee (TC) — 0 for free/practice" type="number" min="0" value={form.entry_fee_tc} onChange={setNum('entry_fee_tc')} />
      {isPractice && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
          🎯 This will be a <strong>Practice Tournament</strong> — platform fee is {PLATFORM_FEE_TC} TC (charged on publish)
        </div>
      )}
      {!isPractice && (
        <>
          <Select label="Prize Pool Funded By" value={form.prize_funded_by} onChange={set('prize_funded_by')}>
            <option value="entry_fees">Entry Fees</option>
            <option value="organizer">I will fund</option>
            <option value="both">Both</option>
          </Select>
          <Input label="Prize Pool (TC)" type="number" min="0" value={form.prize_pool_tc} onChange={setNum('prize_pool_tc')} />
          {form.prize_pool_tc > 0 && (
            <Select label="Prize Distribution" value={form.prize_distribution} onChange={set('prize_distribution')}>
              {PRIZE_DISTRIBUTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          )}
          <div className="flex items-center justify-between bg-surface2 rounded-xl p-4">
            <div>
              <p className="text-sm font-semibold text-white">Organizer Earnings</p>
              <p className="text-xs text-muted">Earn from entry fees minus prize pool</p>
            </div>
            <button onClick={() => set('organizer_earnings_enabled')({ target: { value: !form.organizer_earnings_enabled } })}
              className={`w-12 h-6 rounded-full transition-colors ${form.organizer_earnings_enabled ? 'bg-primary' : 'bg-surface'} border border-white/10 relative`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.organizer_earnings_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {form.organizer_earnings_enabled && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm text-white/80">
              💡 Your earnings = Entry Fees − Prize Pool. Tourena takes 5% commission on withdrawal only. No upfront fee.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Step4({ form, isPractice, profile }) {
  const rows = [
    ['Title', form.title], ['Game', form.game_name], ['Type', form.game_type],
    ['Format', form.format?.replace('_', ' ')], ['Mode', form.mode],
    ['Max Players', form.max_participants], ['Entry Fee', `${formatTC(form.entry_fee_tc)}`],
    ['Prize Pool', `${formatTC(form.prize_pool_tc)}`], ['Visibility', form.is_public ? 'Public' : 'Private'],
  ]
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Review & Publish</h2>
      <div className="bg-surface2 rounded-xl divide-y divide-white/[0.06]">
        {rows.map(([k, v]) => v ? (
          <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted">{k}</span><span className="text-white font-medium capitalize">{v}</span>
          </div>
        ) : null)}
      </div>
      <div className={`rounded-xl p-4 text-sm ${isPractice ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300' : 'bg-primary/10 border border-primary/20 text-white/80'}`}>
        {isPractice
          ? `⚡ Practice tournament — ${PLATFORM_FEE_TC} TC flat fee deducted from your balance on submit`
          : '✅ No upfront fee — Tourena takes 5% of your net earnings on withdrawal only'}
      </div>
      <div className="flex justify-between text-sm bg-surface2 rounded-xl px-4 py-3">
        <span className="text-muted">Your TC balance</span>
        <span className="text-accent font-bold">🪙 {formatTC(profile?.coin_balance ?? 0)}</span>
      </div>
      {isPractice && (profile?.coin_balance ?? 0) < PLATFORM_FEE_TC && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
          ⚠️ Insufficient TC balance. You need {PLATFORM_FEE_TC} TC to publish.
        </div>
      )}
      <div className="bg-surface2 rounded-xl p-3 text-xs text-muted">
        ℹ️ Our team reviews all tournaments within 24 hours to prevent fraud and ensure fair play.
      </div>
    </div>
  )
}
