import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatTC } from '../../lib/utils'
import NotificationPanel, { NotificationBell } from '../ui/NotificationPanel'
import tourenaIcon from '../../../image/tourena-icon.png'

function TourenaLogo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-2xl font-black tracking-tight whitespace-nowrap">
      <img src={tourenaIcon} alt="Tourena" className="w-7 h-7 rounded" />
      <span><span className="text-white">Toure</span><span className="text-accent">na</span></span>
    </Link>
  )
}

const NAV_LINKS = {
  organizer: [
    { to: '/my-tournaments', label: 'My Tournaments' },
    { to: '/create-tournament', label: 'Create Tournament' },
    { to: '/verified-organizers', label: 'Verified Organizers' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/teams', label: 'Teams' },
    { to: '/communities', label: 'Communities' },
    { to: '/groups', label: 'Groups' },
    { to: '/news', label: 'News' },
    { to: '/events', label: 'Events' },
    { to: '/wallet', label: 'Wallet' },
    { to: '/referrals', label: 'Referrals' },
  ],
  player: [
    { to: '/discover', label: 'Discover' },
    { to: '/verified-organizers', label: 'Verified Organizers' },
    { to: '/create-casual-game', label: 'Create Casual Game' },
    { to: '/tournaments', label: 'My Tournaments' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/teams', label: 'Teams' },
    { to: '/communities', label: 'Communities' },
    { to: '/groups', label: 'Groups' },
    { to: '/news', label: 'News' },
    { to: '/events', label: 'Events' },
    { to: '/wallet', label: 'Wallet' },
    { to: '/referrals', label: 'Referrals' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/coin-circulation', label: 'Coin Circulation' },
    { to: '/admin/revenue', label: 'Revenue' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/host-applications', label: 'Host Applications' },
    { to: '/admin/verified-org-applications', label: 'Verified Org Apps' },
    { to: '/admin/game-registrations', label: 'Game Registrations' },
    { to: '/admin/tournaments', label: 'Tournaments' },
    { to: '/admin/withdrawals', label: 'Withdrawals' },
    { to: '/admin/transactions', label: 'Transactions' },
    { to: '/admin/communities', label: 'Communities' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/sponsors', label: 'Sponsors' },
    { to: '/admin/events', label: 'Events' },
    { to: '/admin/news', label: 'News' },
    { to: '/admin/earnings-flow', label: 'Earnings Flow' },
    { to: '/admin/platform-assets', label: 'Platform Assets' },
    { to: '/admin/settings', label: 'Settings' },
  ],
}

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadDMs, setUnreadDMs] = useState(0)
  const dropRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Unread DM count
  useEffect(() => {
    if (!profile || profile.is_admin || profile.is_moderator) return
    async function fetchUnread() {
      const { data: convos } = await supabase.from('conversations')
        .select('id')
        .or(`participant_a.eq.${profile.id},participant_b.eq.${profile.id}`)
      if (!convos?.length) return
      const ids = convos.map(c => c.id)
      const { count } = await supabase.from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', ids)
        .eq('is_read', false)
        .neq('sender_id', profile.id)
      setUnreadDMs(count ?? 0)
    }
    fetchUnread()
    const channel = supabase.channel('dm-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, fetchUnread)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Build moderator nav dynamically from their permissions
  const modLinks = profile.is_moderator ? [
    { to: '/mod', label: 'Dashboard' },
    ...(profile.moderator_permissions?.review_tournaments ? [{ to: '/mod/tournaments', label: 'Tournaments' }] : []),
    ...(profile.moderator_permissions?.manage_users       ? [{ to: '/mod/users', label: 'Users' }] : []),
    ...(profile.moderator_permissions?.manage_reports     ? [{ to: '/mod/reports', label: 'Reports' }] : []),
    ...(profile.moderator_permissions?.manage_communities ? [{ to: '/mod/communities', label: 'Communities' }] : []),
    ...(profile.moderator_permissions?.manage_news        ? [{ to: '/mod/news', label: 'News' }] : []),
  ] : []

  if (!profile) return null

  const role = profile.is_admin ? 'admin' : profile.is_moderator ? 'moderator' : profile.role
  const links = role === 'moderator' ? modLinks : (NAV_LINKS[role] ?? NAV_LINKS.player)

  async function handleLogout() {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <nav className="sticky top-0 z-40 bg-surface border-b border-white/[0.08] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <TourenaLogo />

        {/* Desktop nav — scrollable strip so it never wraps */}
        <div className="hidden md:flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1 mx-2">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${location.pathname === l.to ? 'text-white bg-surface2' : 'text-muted hover:text-white hover:bg-surface2'}`}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search link */}
          {!profile.is_admin && !profile.is_moderator && (
            <Link to="/search" className="hidden sm:block px-3 py-1.5 text-sm text-muted hover:text-white hover:bg-surface2 rounded-lg transition-colors">
              Search
            </Link>
          )}

          {/* Messages link */}
          {!profile.is_admin && !profile.is_moderator && (
            <Link to="/messages" className="relative hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-white hover:bg-surface2 rounded-lg transition-colors">
              Messages
              {unreadDMs > 0 && (
                <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadDMs > 9 ? '9+' : unreadDMs}
                </span>
              )}
            </Link>
          )}

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => setNotifOpen(v => !v)} className="relative p-2 hover:bg-surface2 rounded-lg transition-colors">
              <NotificationBell />
            </button>
            {notifOpen && <NotificationPanel />}
          </div>

          <Link to="/wallet" className="hidden sm:flex items-center gap-1.5 bg-surface2 hover:bg-surface border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
            <img src="/coin.svg" alt="TC" className="w-4 h-4" />
            <span className="text-accent font-bold text-sm">{formatTC(profile.coin_balance ?? 0)}</span>
          </Link>

          {/* Avatar dropdown */}
          <div className="relative" ref={dropRef}>
            <button onClick={() => setDropOpen(v => !v)} className="flex items-center gap-2 hover:bg-surface2 rounded-lg px-2 py-1.5 transition-colors">
              {profile.avatar_url
                ? <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover" alt={profile.username} />
                : <div className="w-8 h-8 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center text-xs font-bold text-white">{(profile.username ?? 'U').slice(0,2).toUpperCase()}</div>
              }
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium text-white leading-tight">{profile.username}</span>
                {profile.is_admin && <span className="text-xs text-red-400 leading-tight">Admin</span>}
                {!profile.is_admin && profile.is_moderator && <span className="text-xs text-purple-400 leading-tight">Moderator</span>}
              </div>
              <ChevronDown size={14} className="text-muted" />
            </button>
            {dropOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                <Link to={`/profile/${profile.username}`} onClick={() => setDropOpen(false)} className="block px-4 py-3 text-sm text-white hover:bg-surface2 transition-colors">
                  Profile
                </Link>
                <Link to="/wallet" onClick={() => setDropOpen(false)} className="block px-4 py-3 text-sm text-white hover:bg-surface2 transition-colors">
                  Wallet
                </Link>
                <Link to="/referrals" onClick={() => setDropOpen(false)} className="block px-4 py-3 text-sm text-white hover:bg-surface2 transition-colors">
                  Referrals
                </Link>
                <Link to="/settings" onClick={() => setDropOpen(false)} className="block px-4 py-3 text-sm text-white hover:bg-surface2 transition-colors">
                  Settings
                </Link>
                <div className="border-t border-white/10" />
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-surface2 transition-colors">
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden text-muted hover:text-white" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-surface px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === l.to ? 'text-white bg-surface2' : 'text-muted hover:text-white hover:bg-surface2'}`}>
              {l.label}
            </Link>
          ))}
          {!profile.is_admin && !profile.is_moderator && (
            <>
              <div className="border-t border-white/10 my-1" />
              <Link to="/search" onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/search' ? 'text-white bg-surface2' : 'text-muted hover:text-white hover:bg-surface2'}`}>
                Search
              </Link>
              <Link to="/messages" onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/messages' ? 'text-white bg-surface2' : 'text-muted hover:text-white hover:bg-surface2'}`}>
                Messages
                {unreadDMs > 0 && (
                  <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadDMs > 9 ? '9+' : unreadDMs}
                  </span>
                )}
              </Link>
            </>
          )}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <img src="/coin.svg" alt="TC" className="w-4 h-4" />
              <span className="text-accent font-bold text-sm">{formatTC(profile.coin_balance ?? 0)}</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
