import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, X, CheckCheck } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { timeAgo } from '../../lib/utils'

const NOTIF_ICONS = {
  coin_gift: '🎁', coin_grant: '🪙', tournament_approved: '✅', tournament_rejected: '❌',
  tournament_start: '🎮', match_ready: '⚔️', prize_awarded: '🏆', withdrawal_processed: '💸',
  withdrawal_failed: '⚠️', new_follower: '👤', community_invite: '🏘️', group_invite: '👾',
  dm_received: '💬', mention: '@', system: '📢',
  host_approved: '🎪', host_rejected: '❌', verified_organizer_approved: '⭐', verified_organizer_rejected: '❌',
}

export default function NotificationPanel() {
  const { notifications, unread, markAllRead, markRead } = useNotifications()
  const panelRef = useRef(null)

  return (
    <div ref={panelRef} className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-surface2">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-primary" />
          <span className="text-sm font-bold text-white">Notifications</span>
          {unread > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{unread}</span>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary hover:text-purple-300 transition-colors font-medium">
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>
      <div className="max-h-[32rem] overflow-y-auto divide-y divide-white/[0.06]">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
            className={`flex items-start gap-3 px-4 py-3 hover:bg-surface2 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
            <span className="text-2xl flex-shrink-0 mt-0.5">{NOTIF_ICONS[n.type] ?? '🔔'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-tight ${!n.is_read ? 'text-white' : 'text-white/80'}`}>{n.title}</p>
              {n.body && <p className="text-xs text-muted mt-1 line-clamp-2">{n.body}</p>}
              <p className="text-xs text-muted/60 mt-1.5">{timeAgo(n.created_at)}</p>
            </div>
            {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2 animate-pulse" />}
          </div>
        ))}
      </div>
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10 bg-surface2 text-center">
          <Link to="/notifications" className="text-xs text-primary hover:text-purple-300 font-medium">View all notifications</Link>
        </div>
      )}
    </div>
  )
}

export function NotificationBell() {
  const { unread } = useNotifications()
  return (
    <div className="relative">
      <Bell size={20} className="text-muted" />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>
  )
}
