import { useState } from 'react'
import { Flag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import toast from 'react-hot-toast'

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'cheating', label: 'Cheating' },
  { value: 'other', label: 'Other' },
]

export default function ReportButton({ targetType, targetId, className = '' }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!reason) return
    setSubmitting(true)
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    })
    setSubmitting(false)
    if (error) { toast.error('Failed to submit report'); return }
    toast.success('Report submitted')
    setOpen(false)
    setDetails('')
    setReason('spam')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 text-xs text-muted hover:text-red-400 transition-colors ${className}`}
        title="Report">
        <Flag size={13} /> Report
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Report Content">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Additional details (optional)</label>
            <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3}
              placeholder="Describe the issue..."
              className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary resize-none" />
          </div>
          <button onClick={submit} disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </Modal>
    </>
  )
}
