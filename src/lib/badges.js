/**
 * @file badges.js
 * Badge award logic and player stat tracking for Tourena.
 *
 * Badges are checked after any stat-changing event:
 * - Tournament completion (win or loss)
 * - Coin purchase (via Wallet)
 *
 * All badge definitions live in `constants.js` (BADGES array).
 * Earned badges are stored in the `player_badges` table.
 * Toast notifications are shown when a new badge is earned.
 */

import { supabase } from './supabase'
import { BADGES } from './constants'
import toast from 'react-hot-toast'

/**
 * Check all badge conditions for a user and award any newly earned badges.
 * Safe to call multiple times — skips already-earned badges.
 *
 * Checks the following conditions:
 * - Win-based: first_blood, double_tap, hat_trick, champion, legend
 * - Play-based: battle_ready, veteran, elite
 * - Earnings-based: coin_collector, high_roller
 * - Streak-based: streak_master, unstoppable
 * - Organizer-based: top_organizer, community_builder
 * - Practice-based: practice_perfect
 *
 * @param {string} userId - UUID of the user to check badges for
 * @returns {Promise<void>}
 */
export async function checkAndAwardBadges(userId) {
  const [{ data: stats }, { data: existingBadges }, { count: hostedCompleted }] = await Promise.all([
    supabase.from('player_stats').select('*').eq('user_id', userId).single(),
    supabase.from('player_badges').select('badge_type').eq('user_id', userId),
    supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('organizer_id', userId).eq('status', 'completed'),
  ])

  if (!stats) return

  const earned = new Set((existingBadges ?? []).map(b => b.badge_type))
  const toAward = []

  const conditions = {
    first_blood:       stats.tournaments_won >= 1,
    double_tap:        stats.tournaments_won >= 2,
    hat_trick:         stats.tournaments_won >= 3,
    champion:          stats.tournaments_won >= 5,
    legend:            stats.tournaments_won >= 10,
    battle_ready:      stats.tournaments_played >= 10,
    veteran:           stats.tournaments_played >= 25,
    elite:             stats.tournaments_played >= 50,
    coin_collector:    stats.total_tc_earned >= 1000,
    high_roller:       stats.total_tc_earned >= 10000,
    streak_master:     stats.current_win_streak >= 3,
    unstoppable:       stats.current_win_streak >= 5,
    top_organizer:     (hostedCompleted ?? 0) >= 5,
  }

  // practice_perfect: count completed practice tournaments the user participated in
  const { data: practiceTournaments } = await supabase
    .from('tournaments')
    .select('id')
    .eq('is_practice', true)
    .eq('status', 'completed')

  const practiceIds = (practiceTournaments ?? []).map(t => t.id)

  let practiceCompleted = 0
  if (practiceIds.length > 0) {
    const { count } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('tournament_id', practiceIds)
    practiceCompleted = count ?? 0
  }

  conditions.practice_perfect = practiceCompleted >= 3

  // community_builder: any hosted tournament with 50+ participants
  const { data: bigTournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('organizer_id', userId)
    .gte('current_participants', 50)
    .limit(1)

  conditions.community_builder = (bigTournament?.length ?? 0) > 0

  for (const badge of BADGES) {
    if (!earned.has(badge.type) && conditions[badge.type]) {
      toAward.push(badge)
    }
  }

  // Insert newly earned badges and show toast notifications
  for (const badge of toAward) {
    await supabase.from('player_badges').insert({
      user_id: userId,
      badge_type: badge.type,
      badge_name: badge.name,
      badge_description: badge.description,
    })
    toast.success(`New Badge Earned: ${badge.name}!`, {
      duration: 4000,
      style: badge.rare
        ? { background: '#12121A', border: '1px solid #F59E0B', color: '#F59E0B' }
        : { background: '#12121A', border: '1px solid #7C3AED', color: '#fff' },
    })
  }
}

/**
 * Update a player's stats after a tournament result, then check for new badges.
 * Call this for every participant (winner and losers) when a tournament completes.
 *
 * Updates:
 * - tournaments_played (always +1)
 * - tournaments_won (only if won)
 * - current_win_streak (increments on win, resets to 0 on loss)
 * - longest_win_streak (updated if new streak exceeds previous best)
 * - total_tc_earned (adds prize TC)
 * - best_prize_tc (updated if new prize exceeds previous best)
 * - favourite_game / favourite_mode (updated to latest)
 * - last_active / updated_at (set to now)
 *
 * @param {string} userId - UUID of the player
 * @param {object} result
 * @param {boolean} result.won - Whether this player won
 * @param {number} result.prizeTC - TC prize amount (0 if no prize)
 * @param {string} result.gameMode - Tournament mode (e.g. 'solo', 'team')
 * @param {string} result.gameName - Game name (e.g. 'FIFA', 'PUBG')
 * @returns {Promise<void>}
 */
export async function updatePlayerStats(userId, { won, prizeTC, gameMode, gameName }) {
  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!stats) return

  const newPlayed = (stats.tournaments_played ?? 0) + 1
  const newWon = won ? (stats.tournaments_won ?? 0) + 1 : stats.tournaments_won ?? 0
  const newStreak = won ? (stats.current_win_streak ?? 0) + 1 : 0
  const newLongest = Math.max(stats.longest_win_streak ?? 0, newStreak)
  const newTcEarned = (stats.total_tc_earned ?? 0) + (prizeTC ?? 0)
  const newBestPrize = Math.max(stats.best_prize_tc ?? 0, prizeTC ?? 0)

  await supabase.from('player_stats').update({
    tournaments_played: newPlayed,
    tournaments_won: newWon,
    current_win_streak: newStreak,
    longest_win_streak: newLongest,
    total_tc_earned: newTcEarned,
    best_prize_tc: newBestPrize,
    favourite_game: gameName ?? stats.favourite_game,
    favourite_mode: gameMode ?? stats.favourite_mode,
    last_active: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  await checkAndAwardBadges(userId)
}
