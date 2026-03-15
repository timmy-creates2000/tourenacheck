import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-hot-toast'
import { timeAgo } from '../../lib/utils'

const STATUS_TABS = ['pending','reviewed','actioned','dismissed']
const REASON_COLORS = { spam:'bg-yellow-500/20 text-yellow-400', harassment:'bg-red-500/20 text-red-400', inappropriate:'bg-orange-500/20 text-orange-400', cheating:'bg-purple-500/20 text-purple-400', other:'bg-surface2 text-muted' }

export default function AdminReports() {
  const { profile } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('pending')
  const [acting, setActing] = useState(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(username, avatar_url)')
      .eq('status', status)
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setReports(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [status])

  async function updateStatus(id, newStatus) {
    setActing(id)
    const { error } = await supabase.from('reports').update({
      status: newStatus,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(`Report ${newStatus}`); load() }
    setActing(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-muted text-sm mt-1">Review user-submitted reports</p>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${status === s ? 'bg-primary text-white' : 'bg-surface2 text-muted hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-muted">No {status} reports</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-surface border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {r.reporter?.avatar_url
                    ? <img src={r.reporter.avatar_url} className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" alt="" />
                    : <div className="w-9 h-9 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">{r.reporter?.username?.slice(0,2).toUpperCase() ?? '??'}</div>
                  }
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{r.reporter?.username}</span>
                      <span className="text-xs text-muted">reported a</span>
                      <span className="text-sm font-medium text-white capitalize">{r.target_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${REASON_COLORS[r.reason]}`}>{r.reason}</span>
                    </div>
                    {r.details && <p className="text-sm text-muted mt-1">{r.details}</p>}
                    <p className="text-xs text-muted mt-1">{timeAgo(r.created_at)} · Target ID: <span className="font-mono text-xs">{r.target_id.slice(0,8)}...</span></p>
                  </div>
                </div>
                {status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => updateStatus(r.id, 'actioned')} disabled={acting === r.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                      Take Action
                    </button>
                    <button onClick={() => updateStatus(r.id, 'dismissed')} disabled={acting === r.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-surface2 text-muted hover:text-white transition-colors">
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
