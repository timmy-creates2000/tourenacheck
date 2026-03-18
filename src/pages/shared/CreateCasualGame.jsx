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
import { Users, Link as LinkIcon, Info } from 'lucide-react'

export default function CreateCasualGame() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    gameName: '',
    description: '',
    maxParticipants: 8,
    startTime: ''
  })
  const [loading, setLoading] = useState(false)
  const [shareableLink, setShareableLink] = useState('')

  function set(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })) }

  async function handleCreate() {
    if (!form.title.trim() || !form.gameName) {
      toast.error('Please fill required fields')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.from('tournaments').insert({
        organizer_id: profile.id,
        title: form.title,
        game_name: form.gameName,
        description: form.description || 'Casual game with friends',
        max_participants: form.maxParticipants,
        start_date: form.startTime || new Date(Date.now() + 3600000).toISOString(),
        is_casual: true,
        is_public: false,
        requires_approval: false,
        approval_status: 'approved',
        status: 'published',
        entry_fee_tc: 0,
        prize_pool_tc: 0,
        format: 'custom',
        mode: 'solo'
      }).select().single()

      if (error) throw error

      const link = `${window.location.origin}/tournament/${data.id}`
      setShareableLink(link)
      toast.success('Casual game created!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (shareableLink) {
    return (
      <PageWrapper className="max-w-2xl">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="text-green-400" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Game Created!</h2>
          <p className="text-muted mb-6">Share this link with your friends</p>
          <div className="bg-surface2 rounded-lg p-4 mb-6">
            <p className="text-sm text-white break-all">{shareableLink}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(shareableLink)
                toast.success('Link copied!')
              }}
              variant="accent"
              className="flex-1"
            >
              Copy Link
            </Button>
            <Button
              onClick={() => navigate(`/tournament/${shareableLink.split('/').pop()}`)}
              variant="secondary"
              className="flex-1"
            >
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
      <p className="text-muted mb-8">Quick game setup for playing with friends</p>

      <Card className="p-6 mb-6 border-blue-500/30 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-1">Casual Game Features:</p>
            <ul className="space-y-1 text-xs">
              <li>• Created instantly (no approval needed)</li>
              <li>• Private only (share link with friends)</li>
              <li>• Free to join (no entry fee)</li>
              <li>• Not shown in public discover page</li>
              <li>• Perfect for practice or friendly matches</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <Input
            label="Game Title"
            required
            placeholder="e.g. Friday Night FIFA"
            value={form.title}
            onChange={set('title')}
          />

          <Select label="Game" required value={form.gameName} onChange={set('gameName')}>
            <option value="">Select game</option>
            {GAMES.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
          </Select>

          <Textarea
            label="Description (Optional)"
            placeholder="Any special rules or notes..."
            value={form.description}
            onChange={set('description')}
            rows={3}
          />

          <Input
            label="Max Players"
            type="number"
            min={2}
            max={64}
            value={form.maxParticipants}
            onChange={set('maxParticipants')}
          />

          <Input
            label="Start Time (Optional)"
            type="datetime-local"
            value={form.startTime}
            onChange={set('startTime')}
          />

          <Button
            onClick={handleCreate}
            loading={loading}
            className="w-full"
            size="lg"
          >
            Create Game
          </Button>
        </div>
      </Card>
    </PageWrapper>
  )
}
