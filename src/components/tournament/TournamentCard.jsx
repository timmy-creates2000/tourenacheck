import { Link } from 'react-router-dom'
import { Users, Trophy, Calendar, Flame } from 'lucide-react'
import Badge from '../ui/Badge'
import CountdownTimer from '../ui/CountdownTimer'
import { formatTC, formatDateTime, getPlayerStars, getStreakTier } from '../../lib/utils'
import { STATUS_COLORS } from '../../lib/constants'

export default function TournamentCard({ tournament, actions, organizer = false, playerStats = null }) {
  const t = tournament
  const isPractice = t.is_practice
  const progress = t.max_participants > 0 ? (t.current_participants / t.max_participants) * 100 : 0
  const stars = playerStats ? getPlayerStars(playerStats.tournaments_won ?? 0, playerStats.tournaments_played ?? 0) : null
  const streakTier = playerStats ? getStreakTier(playerStats.current_win_streak ?? 0) : null

  return (
    <div className="bg-surface rounded-xl border border-white/[0.08] overflow-hidden hover:border-primary/30 transition-all duration-200 group flex flex-col">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-surface2">
        {t.thumbnail_url
          ? <img src={t.thumbnail_url} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
        }
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? 'bg-gray-600 text-gray-200'}`}>{t.status?.replace('_', ' ')}</span>
          {isPractice && <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-gray-500 text-gray-400">Practice</span>}
        </div>
        {t.game_type && (
          <div className="absolute top-2 right-2">
            <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full capitalize">{t.game_type}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-bold text-white text-sm leading-tight line-clamp-2">{t.title}</h3>
          <p className="text-xs text-muted mt-0.5">{t.game_name}</p>
        </div>

        {/* Player stars + streak (when playerStats provided) */}
        {(stars !== null || streakTier) && (
          <div className="flex items-center gap-2 flex-wrap">
            {stars !== null && (
              <span className="text-xs text-yellow-400 font-semibold">{'⭐'.repeat(Math.min(stars, 5))}</span>
            )}
            {streakTier && streakTier.tier > 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${streakTier.color} bg-black/30`}>
                <Flame size={10} />{playerStats.current_win_streak}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          <Badge color="purple">{t.format?.replace('_', ' ')}</Badge>
          <Badge color="amber">{t.mode === 'custom' ? t.custom_mode_name : t.mode?.replace('_', ' ')}</Badge>
        </div>

        {/* Participants progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted">
            <span className="flex items-center gap-1"><Users size={11} />{t.current_participants}/{t.max_participants}</span>
            <span>{Math.round(progress)}% full</span>
          </div>
          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Prize & Entry */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-accent text-sm font-bold">
            <img src="/coin.svg" alt="TC" className="w-4 h-4" />
            {isPractice ? <span className="text-muted text-xs font-normal">No prize</span> : <span>{formatTC(t.prize_pool_tc ?? 0)}</span>}
          </div>
          <div className="text-xs text-muted">
            {isPractice ? 'Free entry' : t.entry_fee_tc === 0 ? 'Free' : <span className="text-white font-semibold flex items-center gap-1"><img src="/coin.svg" alt="TC" className="w-3 h-3" /> {formatTC(t.entry_fee_tc)}</span>}
          </div>
        </div>

        {/* Deadline countdown */}
        {t.registration_deadline && t.status === 'published' && (
          <CountdownTimer date={t.registration_deadline} label="Closes in" />
        )}

        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-muted">
          <Calendar size={11} />
          <span>{formatDateTime(t.start_date)}</span>
        </div>

        {/* Organizer earnings on completed */}
        {organizer && t.status === 'completed' && t.organizer_earnings_tc > 0 && (
          <div className="text-xs text-green-400 font-semibold flex items-center gap-1">
            <Trophy size={11} /> Net earned: 🪙 {formatTC(t.organizer_earnings_tc)}
          </div>
        )}

        {/* Actions */}
        {actions && <div className="flex gap-2 mt-auto pt-2 border-t border-white/[0.06]">{actions}</div>}

        {/* Default view link */}
        {!actions && (
          <Link to={`/tournament/${t.id}`} className="mt-auto pt-2 border-t border-white/[0.06] text-xs text-primary hover:text-purple-300 font-semibold transition-colors">
            View Details →
          </Link>
        )}
      </div>
    </div>
  )
}
