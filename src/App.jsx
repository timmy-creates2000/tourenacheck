import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import tourenaIcon from '../image/tourena-icon.png'

// Auth
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import AccountPending from './pages/auth/AccountPending'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Shared
import Wallet from './pages/shared/Wallet'
import Referrals from './pages/shared/Referrals'
import PublicProfile from './pages/shared/PublicProfile'
import ProfileSettings from './pages/shared/ProfileSettings'
import Messages from './pages/shared/Messages'
import Communities from './pages/shared/Communities'
import CommunityDetail from './pages/shared/CommunityDetail'
import Groups from './pages/shared/Groups'
import GroupDetail from './pages/shared/GroupDetail'
import NewsPage from './pages/shared/NewsPage'
import EventsPage from './pages/shared/EventsPage'
import Search from './pages/shared/Search'
import Teams from './pages/shared/Teams'
import TeamDetail from './pages/shared/TeamDetail'

// Player
import Discover from './pages/player/Discover'
import TournamentDetail from './pages/player/TournamentDetail'
import MyTournamentsPlayer from './pages/player/MyTournamentsPlayer'
import Leaderboard from './pages/player/Leaderboard'

// Organizer
import MyTournaments from './pages/organizer/MyTournaments'
import CreateTournament from './pages/organizer/CreateTournament'
import ManageTournament from './pages/organizer/ManageTournament'
import Analytics from './pages/organizer/Analytics'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminRevenue from './pages/admin/AdminRevenue'
import AdminUsers from './pages/admin/AdminUsers'
import AdminTournaments from './pages/admin/AdminTournaments'
import AdminWithdrawals from './pages/admin/AdminWithdrawals'
import AdminTransactions from './pages/admin/AdminTransactions'
import AdminSettings from './pages/admin/AdminSettings'
import AdminSponsors from './pages/admin/AdminSponsors'
import AdminEvents from './pages/admin/AdminEvents'
import AdminNews from './pages/admin/AdminNews'
import AdminCommunities from './pages/admin/AdminCommunities'
import AdminReports from './pages/admin/AdminReports'
import AdminEarningsFlow from './pages/admin/AdminEarningsFlow'

// Moderator
import ModeratorDashboard from './pages/moderator/ModeratorDashboard'
import ModTournaments from './pages/moderator/ModTournaments'
import ModUsers from './pages/moderator/ModUsers'
import ModReports from './pages/moderator/ModReports'
import ModCommunities from './pages/moderator/ModCommunities'
import ModNews from './pages/moderator/ModNews'

function AuthGuard({ children }) {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (loading) return
    if (!user) { navigate('/login', { replace: true }); return }
    if (profile?.account_status === 'pending' || profile?.account_status === 'rejected') {
      if (location.pathname !== '/pending') navigate('/pending', { replace: true })
    }
  }, [user, profile, loading, location.pathname])

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <img src={tourenaIcon} alt="Tourena" className="w-20 h-20 rounded-2xl mx-auto mb-4" />
        <h1 className="text-4xl font-black mb-6 whitespace-nowrap"><span className="text-white">Toure</span><span className="text-accent">na</span></h1>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )

  if (!user) return null
  return children
}

function AdminGuard({ children }) {
  const { profile } = useAuth()
  if (!profile?.is_admin) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-muted">You don't have permission to view this page.</p>
      </div>
    </div>
  )
  return children
}

function ModeratorGuard({ permission, children }) {
  const { profile } = useAuth()
  const perms = profile?.moderator_permissions ?? {}
  const allowed = profile?.is_admin || profile?.is_moderator && (!permission || perms[permission])
  if (!allowed) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-muted">You don't have this moderator permission.</p>
      </div>
    </div>
  )
  return children
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      {children}
    </div>
  )
}

function HomeRedirect() {
  const { profile, loading, user } = useAuth()
  if (loading || (user && !profile)) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (profile.is_admin) return <Navigate to="/admin" replace />
  if (profile.is_moderator) return <Navigate to="/mod" replace />
  if (profile.role === 'organizer') return <Navigate to="/my-tournaments" replace />
  return <Navigate to="/discover" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#12121A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
          success: { iconTheme: { primary: '#7C3AED', secondary: '#fff' } },
        }} />
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Pending */}
          <Route path="/pending" element={<AuthGuard><AccountPending /></AuthGuard>} />

          {/* Protected routes */}
          <Route path="/" element={<AuthGuard><AppLayout><HomeRedirect /></AppLayout></AuthGuard>} />

          {/* Shared */}
          <Route path="/wallet" element={<AuthGuard><AppLayout><Wallet /></AppLayout></AuthGuard>} />
          <Route path="/referrals" element={<AuthGuard><AppLayout><Referrals /></AppLayout></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><AppLayout><ProfileSettings /></AppLayout></AuthGuard>} />
          <Route path="/profile/:username" element={<AuthGuard><AppLayout><PublicProfile /></AppLayout></AuthGuard>} />
          <Route path="/messages" element={<AuthGuard><AppLayout><Messages /></AppLayout></AuthGuard>} />
          <Route path="/communities" element={<AuthGuard><AppLayout><Communities /></AppLayout></AuthGuard>} />
          <Route path="/community/:slug" element={<AuthGuard><AppLayout><CommunityDetail /></AppLayout></AuthGuard>} />
          <Route path="/groups" element={<AuthGuard><AppLayout><Groups /></AppLayout></AuthGuard>} />
          <Route path="/group/:id" element={<AuthGuard><AppLayout><GroupDetail /></AppLayout></AuthGuard>} />
          <Route path="/news" element={<AuthGuard><AppLayout><NewsPage /></AppLayout></AuthGuard>} />
          <Route path="/events" element={<AuthGuard><AppLayout><EventsPage /></AppLayout></AuthGuard>} />
          <Route path="/search" element={<AuthGuard><AppLayout><Search /></AppLayout></AuthGuard>} />
          <Route path="/teams" element={<AuthGuard><AppLayout><Teams /></AppLayout></AuthGuard>} />
          <Route path="/team/:id" element={<AuthGuard><AppLayout><TeamDetail /></AppLayout></AuthGuard>} />

          {/* Player */}
          <Route path="/discover" element={<AuthGuard><AppLayout><Discover /></AppLayout></AuthGuard>} />
          <Route path="/tournament/:id" element={<AuthGuard><AppLayout><TournamentDetail /></AppLayout></AuthGuard>} />
          <Route path="/tournaments" element={<AuthGuard><AppLayout><MyTournamentsPlayer /></AppLayout></AuthGuard>} />
          <Route path="/leaderboard" element={<AuthGuard><AppLayout><Leaderboard /></AppLayout></AuthGuard>} />

          {/* Organizer */}
          <Route path="/my-tournaments" element={<AuthGuard><AppLayout><MyTournaments /></AppLayout></AuthGuard>} />
          <Route path="/create-tournament" element={<AuthGuard><AppLayout><CreateTournament /></AppLayout></AuthGuard>} />
          <Route path="/manage/:id" element={<AuthGuard><AppLayout><ManageTournament /></AppLayout></AuthGuard>} />
          <Route path="/analytics" element={<AuthGuard><AppLayout><Analytics /></AppLayout></AuthGuard>} />

          {/* Admin */}
          <Route path="/admin" element={<AuthGuard><AdminGuard><AppLayout><AdminDashboard /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/revenue" element={<AuthGuard><AdminGuard><AppLayout><AdminRevenue /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/users" element={<AuthGuard><AdminGuard><AppLayout><AdminUsers /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/tournaments" element={<AuthGuard><AdminGuard><AppLayout><AdminTournaments /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/withdrawals" element={<AuthGuard><AdminGuard><AppLayout><AdminWithdrawals /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/transactions" element={<AuthGuard><AdminGuard><AppLayout><AdminTransactions /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/settings" element={<AuthGuard><AdminGuard><AppLayout><AdminSettings /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/sponsors" element={<AuthGuard><AdminGuard><AppLayout><AdminSponsors /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/events" element={<AuthGuard><AdminGuard><AppLayout><AdminEvents /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/news" element={<AuthGuard><AdminGuard><AppLayout><AdminNews /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/communities" element={<AuthGuard><AdminGuard><AppLayout><AdminCommunities /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/reports" element={<AuthGuard><AdminGuard><AppLayout><AdminReports /></AppLayout></AdminGuard></AuthGuard>} />
          <Route path="/admin/earnings-flow" element={<AuthGuard><AdminGuard><AppLayout><AdminEarningsFlow /></AppLayout></AdminGuard></AuthGuard>} />

          {/* Moderator */}
          <Route path="/mod" element={<AuthGuard><ModeratorGuard><AppLayout><ModeratorDashboard /></AppLayout></ModeratorGuard></AuthGuard>} />
          <Route path="/mod/tournaments" element={<AuthGuard><ModeratorGuard permission="review_tournaments"><AppLayout><ModTournaments /></AppLayout></ModeratorGuard></AuthGuard>} />
          <Route path="/mod/users" element={<AuthGuard><ModeratorGuard permission="manage_users"><AppLayout><ModUsers /></AppLayout></ModeratorGuard></AuthGuard>} />
          <Route path="/mod/reports" element={<AuthGuard><ModeratorGuard permission="manage_reports"><AppLayout><ModReports /></AppLayout></ModeratorGuard></AuthGuard>} />
          <Route path="/mod/communities" element={<AuthGuard><ModeratorGuard permission="manage_communities"><AppLayout><ModCommunities /></AppLayout></ModeratorGuard></AuthGuard>} />
          <Route path="/mod/news" element={<AuthGuard><ModeratorGuard permission="manage_news"><AppLayout><ModNews /></AppLayout></ModeratorGuard></AuthGuard>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
