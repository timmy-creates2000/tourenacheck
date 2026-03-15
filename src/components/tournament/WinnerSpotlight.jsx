import { Link } from 'react-router-dom'
import { formatTC } from '../../lib/utils'

export default function WinnerSpotlight({ winner, tournament }) {
  if (!winner || !tournament) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-primary/10 p-8 text-center">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-purple-500/5 pointer-events-none" />

      <div className="relative z-10">
        <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-4">🏆 Tournament Winner</p>

        {/* Avatar */}
        <div className="relative inline-block mb-4">
          {winner.avatar_url
            ? <img src={winner.avatar_url} className="w-24 h-24 rounded-full object-cover border-4 border-accent glow-gold mx-auto" alt={winner.username} />
            : <div className="w-24 h-24 rounded-full bg-accent/20 border-4 border-accent glow-gold flex items-center justify-center text-3xl font-black text-accent mx-auto">
                {winner.username?.slice(0, 2).toUpperCase()}
              </div>
          }
          <div className="absolute -bottom-2 -right-2 text-3xl">🏆</div>
        </div>

        <h2 className="text-3xl font-black text-white mb-1">{winner.username}</h2>
        <p className="text-muted text-sm mb-4">{tournament.title}</p>

        {tournament.prize_pool_tc > 0 && (
          <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-xl px-6 py-3 mb-6">
            <span className="text-2xl">🪙</span>
            <span className="text-2xl font-black text-accent">{formatTC(tournament.prize_pool_tc)}</span>
            <span className="text-muted text-sm">Prize Won</span>
          </div>
        )}

        <div className="flex justify-center">
          <Link
            to={`/profile/${winner.username}`}
            className="inline-flex items-center gap-2 bg-primary hover:bg-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors glow-purple"
          >
            View Profile →
          </Link>
        </div>
      </div>
    </div>
  )
}
