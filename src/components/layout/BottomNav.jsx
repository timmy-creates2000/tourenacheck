import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, Compass, Trophy, Wallet, User } from 'lucide-react'

export default function BottomNav() {
  const { profile } = useAuth()
  const location = useLocation()

  if (!profile || profile.is_admin || profile.is_moderator) return null

  const isOrganizer = profile.role === 'organizer'

  const tabs = isOrganizer
    ? [
        { to: '/my-tournaments', icon: Home,    label: 'Tournaments' },
        { to: '/create-tournament', icon: Trophy, label: 'Create' },
        { to: '/communities', icon: Compass,   label: 'Community' },
        { to: '/wallet',      icon: Wallet,    label: 'Wallet' },
        { to: `/profile/${profile.username}`, icon: User, label: 'Profile' },
      ]
    : [
        { to: '/discover',    icon: Compass,   label: 'Discover' },
        { to: '/tournaments', icon: Trophy,    label: 'My Tournaments' },
        { to: '/communities', icon: Home,      label: 'Community' },
        { to: '/wallet',      icon: Wallet,    label: 'Wallet' },
        { to: `/profile/${profile.username}`, icon: User, label: 'Profile' },
      ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-white/[0.08] safe-bottom">
      <div className="flex items-stretch">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? 'text-primary' : 'text-muted hover:text-white'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="leading-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
