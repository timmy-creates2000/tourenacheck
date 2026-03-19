import { Link } from 'react-router-dom'
import tourenaIcon from '../../image/tourena-icon.png'

const FEATURES = [
  {
    icon: '🎮',
    title: 'Play & Earn',
    desc: 'Join tournaments across 150+ games. Win Tourena Coins redeemable for real cash. Every match is a chance to earn.',
  },
  {
    icon: '🏆',
    title: 'Host & Earn',
    desc: 'Apply to become a tournament host. Create events, grow your audience, and earn commission from every prize pool.',
  },
  {
    icon: '🪙',
    title: 'Tourena Coins (TC)',
    desc: '1 TC = ₦100. Buy, earn, gift, and withdraw. Powered by Flutterwave — fast, secure, and local-friendly.',
  },
  {
    icon: '🌍',
    title: 'Built for Africa',
    desc: 'NGN, GHS, KES support. Mobile-first. Works on any device. Designed for the African gaming community.',
  },
  {
    icon: '⚡',
    title: 'Casual Games',
    desc: 'No approval needed. Create a private game, share a link, and play with friends instantly.',
  },
  {
    icon: '👑',
    title: 'VIP Rewards',
    desc: 'The more you play, the more you earn. Unlock Bronze → Diamond tiers for higher referral bonuses and exclusive perks.',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Create your account', desc: 'Sign up free in seconds. No credit card required.' },
  { step: '02', title: 'Buy or earn Tourena Coins', desc: 'Purchase TC via card, bank transfer, or USSD. Or win them in tournaments.' },
  { step: '03', title: 'Join or host a tournament', desc: 'Browse 150+ supported games. Register, compete, and climb the leaderboard.' },
  { step: '04', title: 'Withdraw your winnings', desc: 'Cash out directly to your bank account. Fast, transparent, and secure.' },
]

const GAMES_SHOWCASE = [
  'PUBG Mobile', 'Free Fire', 'FIFA 24', 'Call of Duty Mobile',
  'Mobile Legends', 'Valorant', 'Chess', 'Ludo King',
  'eFootball', 'Clash Royale', 'Tekken 8', 'NBA 2K24',
]

const STATS = [
  { value: '150+', label: 'Supported Games' },
  { value: '3 Tiers', label: 'Host Progression' },
  { value: '6 VIP', label: 'Reward Tiers' },
  { value: '₦100', label: 'Per Tourena Coin' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-white overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-black">
            <img src={tourenaIcon} alt="Tourena" className="w-8 h-8 rounded-lg" />
            <span><span className="text-white">Toure</span><span className="text-accent">na</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted hover:text-white transition-colors hidden sm:block">Sign In</Link>
            <Link to="/signup" className="bg-primary hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors glow-purple">
              Play Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 text-center overflow-hidden">
        {/* Background glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            The Tournament Arena — Play. Host. Earn.
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight mb-6">
            <span className="gradient-text">Tourena</span>
            <br />
            <span className="text-white text-3xl sm:text-4xl md:text-5xl">Tournament Arena</span>
          </h1>

          <p className="text-muted text-base sm:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
            Compete in online gaming tournaments, win real money, and build your legacy.
            Africa's premier esports platform — mobile, PC, console, and board games.
          </p>

          <p className="text-accent font-bold text-sm sm:text-base mb-10">
            Host & Earn · Play & Earn · Refer & Earn · 1 TC = ₦100
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup"
              className="w-full sm:w-auto bg-primary hover:bg-purple-500 text-white font-bold text-base px-8 py-4 rounded-xl transition-all glow-purple">
              Start Playing Free
            </Link>
            <Link to="/login"
              className="w-full sm:w-auto bg-surface2 hover:bg-surface border border-white/10 text-white font-semibold text-base px-8 py-4 rounded-xl transition-colors">
              Sign In
            </Link>
          </div>

          <p className="text-xs text-muted mt-4">No credit card required · Free to join · Instant setup</p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-white/[0.06] bg-surface/50 py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-2xl sm:text-3xl font-black text-accent">{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              Everything you need to <span className="gradient-text">compete and earn</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto">One platform. Tournaments, coins, communities, teams, and real cash payouts.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-surface border border-white/[0.08] rounded-2xl p-6 hover:border-primary/30 transition-colors group">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">How it works</h2>
            <p className="text-muted">From signup to cash out in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-primary/40 to-transparent z-0" />
                )}
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-primary font-black text-lg">{s.step}</span>
                  </div>
                  <h3 className="font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-muted">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GAMES TICKER ── */}
      <section className="py-14 px-4 overflow-hidden">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">150+ Games Supported</h2>
          <p className="text-muted text-sm">Mobile · PC · Console · Board Games · Sports</p>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 justify-start sm:justify-center flex-wrap sm:flex-nowrap">
          {GAMES_SHOWCASE.map(g => (
            <span key={g} className="flex-shrink-0 bg-surface border border-white/[0.08] rounded-full px-4 py-2 text-sm text-muted hover:text-white hover:border-primary/30 transition-colors whitespace-nowrap">
              {g}
            </span>
          ))}
          <span className="flex-shrink-0 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 text-sm text-primary font-semibold whitespace-nowrap">
            + 138 more
          </span>
        </div>
      </section>

      {/* ── HOST & EARN SECTION ── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-primary/15 to-accent/5 border border-primary/20 rounded-3xl p-8 sm:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-3 py-1 text-xs font-semibold text-accent mb-4">
                  🏆 For Tournament Hosts
                </div>
                <h2 className="text-3xl sm:text-4xl font-black mb-4">
                  Host tournaments.<br /><span className="gradient-text">Earn real money.</span>
                </h2>
                <p className="text-muted mb-6 leading-relaxed">
                  Apply to become a Tourena Host. Create public tournaments, set your own prize pools,
                  and earn commission from every event you run. Top hosts can apply for Verified Organizer status
                  for even greater reach and earnings.
                </p>
                <ul className="space-y-2 mb-8">
                  {[
                    'Earn commission from prize pools',
                    'Create tournaments for 150+ games',
                    'Full analytics and participant management',
                    'Auto-created group chat for each tournament',
                    'Path to Verified Organizer status',
                    'Build your brand in the gaming community',
                  ].map(b => (
                    <li key={b} className="flex items-center gap-2 text-sm text-white/80">
                      <span className="text-primary">✓</span> {b}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Link to="/signup" className="inline-flex bg-accent hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl transition-colors">
                    Apply to Host
                  </Link>
                  <Link to="/login" className="inline-flex bg-surface2 hover:bg-surface text-white font-semibold px-6 py-3 rounded-xl transition-colors border border-white/10">
                    Sign In
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🎪', label: 'Create Events', desc: 'Public or private tournaments' },
                  { icon: '💰', label: 'Earn Commission', desc: 'From every prize pool' },
                  { icon: '📊', label: 'Analytics', desc: 'Track your performance' },
                  { icon: '💬', label: 'Auto Groups', desc: 'Chat for each tournament' },
                  { icon: '🔮', label: 'Verified Status', desc: 'Unlock premium features' },
                  { icon: '🌍', label: 'Global Reach', desc: 'Players from everywhere' },
                ].map(c => (
                  <div key={c.label} className="bg-surface/60 border border-white/[0.08] rounded-2xl p-4 text-center">
                    <div className="text-3xl mb-2">{c.icon}</div>
                    <p className="text-sm font-bold text-white">{c.label}</p>
                    <p className="text-xs text-muted mt-0.5">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── REFERRAL SECTION ── */}
      <section className="py-16 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-4xl mb-4">🤝</div>
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Refer & Earn</h2>
          <p className="text-muted mb-6 leading-relaxed">
            Share your referral code. Earn up to <span className="text-accent font-bold">8% of every coin purchase</span> your
            referrals make for 30 days. Unlock higher rates as you climb VIP tiers.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { tier: '🥉 Bronze', rate: '3%' },
              { tier: '🥈 Silver', rate: '4%' },
              { tier: '🥇 Gold', rate: '5%' },
              { tier: '🔮 Platinum', rate: '6%' },
              { tier: '💎 Diamond', rate: '8%' },
            ].map(t => (
              <div key={t.tier} className="bg-surface border border-white/[0.08] rounded-xl px-4 py-2 text-sm">
                <span className="text-white font-semibold">{t.tier}</span>
                <span className="text-accent font-black ml-2">{t.rate}</span>
              </div>
            ))}
          </div>
          <Link to="/signup" className="inline-flex bg-primary hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl transition-colors glow-purple">
            Start Earning
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            Ready to enter<br /><span className="gradient-text">the arena?</span>
          </h2>
          <p className="text-muted text-lg mb-8">
            Join thousands of gamers competing, earning, and building their legacy on Tourena.
          </p>
          <Link to="/signup"
            className="inline-flex bg-primary hover:bg-purple-500 text-white font-bold text-lg px-10 py-4 rounded-xl transition-all glow-purple">
            Create Free Account
          </Link>
          <p className="text-xs text-muted mt-4">Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <img src={tourenaIcon} alt="Tourena" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-black"><span className="text-white">Toure</span><span className="text-accent">na</span></span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-muted">
              <Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link>
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <a href="mailto:neotimmytech@gmail.com" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted">
            <p>© {new Date().getFullYear()} Tourena — Tournament Arena. All rights reserved.</p>
            <p>
              Built by{' '}
              <a href="mailto:neotimmytech@gmail.com" className="text-primary hover:underline">
                neotimmy
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
