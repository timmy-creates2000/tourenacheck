/**
 * @file referrals.js
 * Referral system logic for Tourena.
 *
 * Flow:
 * 1. User signs up with a referral code → `referred_by` is set on their users row
 * 2. When they complete their first tournament → `activateReferral()` is called
 * 3. Referral becomes active with a 30-day window
 * 4. Every time the referred user buys coins → `processReferralBonus()` is called
 * 5. Referrer earns a % of the TC purchased — rate depends on referrer's VIP tier:
 *    - No VIP:   3%
 *    - Bronze:   3%
 *    - Silver:   4%
 *    - Gold:     5%
 *    - Platinum: 6%
 *    - Diamond:  8%
 * 6. After 30 days the referral expires automatically
 */

import { supabase } from './supabase'
import { REFERRAL_DAYS, getReferralBonusRate } from './constants'

/**
 * Activate a referral when the referred user completes their first tournament.
 * Sets the referral status to 'active' and starts the 30-day earning window.
 * Safe to call multiple times — exits early if already active.
 *
 * @param {string} referredUserId - UUID of the user who was referred
 * @returns {Promise<void>}
 */
export async function activateReferral(referredUserId) {
  const { data: user } = await supabase
    .from('users')
    .select('referred_by')
    .eq('id', referredUserId)
    .single()

  if (!user?.referred_by) return

  const now = new Date()
  const expires = new Date(now.getTime() + REFERRAL_DAYS * 24 * 60 * 60 * 1000)

  const { data: existing } = await supabase
    .from('referrals')
    .select('id, status')
    .eq('referrer_id', user.referred_by)
    .eq('referred_id', referredUserId)
    .single()

  if (existing?.status === 'active') return

  if (existing) {
    await supabase.from('referrals').update({
      status: 'active',
      activated_at: now.toISOString(),
      expires_at: expires.toISOString(),
    }).eq('id', existing.id)
  } else {
    await supabase.from('referrals').insert({
      referrer_id: user.referred_by,
      referred_id: referredUserId,
      status: 'active',
      activated_at: now.toISOString(),
      expires_at: expires.toISOString(),
    })
  }
}

/**
 * Process a referral bonus when a referred user makes a coin purchase.
 * Awards a VIP-tier-aware % of the purchased TC to the referrer.
 *
 * Automatically expires the referral if the 30-day window has passed.
 * Does nothing if no active referral exists.
 *
 * @param {string} referredUserId - UUID of the user who made the purchase
 * @param {number} purchasedTC - Amount of TC purchased
 * @returns {Promise<void>}
 */
export async function processReferralBonus(referredUserId, purchasedTC) {
  const { data: user } = await supabase
    .from('users')
    .select('referred_by')
    .eq('id', referredUserId)
    .single()

  if (!user?.referred_by) return

  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.referred_by)
    .eq('referred_id', referredUserId)
    .eq('status', 'active')
    .single()

  if (!referral) return

  // Auto-expire if window passed
  if (new Date(referral.expires_at) < new Date()) {
    await supabase.from('referrals').update({ status: 'expired' }).eq('id', referral.id)
    return
  }

  // Get referrer's lifetime TC purchased to determine VIP tier bonus rate
  const { data: referrerStats } = await supabase
    .from('coin_transactions')
    .select('amount_tc')
    .eq('user_id', user.referred_by)
    .eq('type', 'purchase')
    .eq('status', 'confirmed')

  const lifetimeTc = referrerStats?.reduce((s, t) => s + (t.amount_tc ?? 0), 0) ?? 0
  const bonusRate = getReferralBonusRate(lifetimeTc)
  const bonus = Math.floor(purchasedTC * bonusRate)
  if (bonus <= 0) return

  // Credit referrer
  await supabase.rpc('credit_coins', {
    p_user_id: user.referred_by,
    p_amount: bonus,
    p_type: 'referral_bonus',
    p_description: `Referral bonus (${Math.round(bonusRate * 100)}%) from coin purchase`,
    p_related_user_id: referredUserId,
  })

  // Update referral total earned
  await supabase.from('referrals').update({
    total_tc_earned: (referral.total_tc_earned ?? 0) + bonus,
  }).eq('id', referral.id)
}

/**
 * Fetch the top N referrers on the platform, sorted by total TC earned.
 * Used for the referral leaderboard.
 *
 * @param {number} limit - Number of top referrers to return (default 20)
 * @returns {Promise<Array<{ referrer_id, username, avatar_url, total_earned, active_count, total_count }>>}
 */
export async function getTopReferrers(limit = 20) {
  const { data, error } = await supabase
    .from('referrals')
    .select('referrer_id, total_tc_earned, status, users!referrals_referrer_id_fkey(id, username, avatar_url, country, is_verified)')
    .order('total_tc_earned', { ascending: false })

  if (error || !data) return []

  // Aggregate by referrer
  const map = {}
  for (const r of data) {
    const id = r.referrer_id
    if (!map[id]) {
      map[id] = {
        referrer_id: id,
        username: r.users?.username,
        avatar_url: r.users?.avatar_url,
        country: r.users?.country,
        is_verified: r.users?.is_verified,
        total_earned: 0,
        active_count: 0,
        total_count: 0,
      }
    }
    map[id].total_earned += r.total_tc_earned ?? 0
    map[id].total_count++
    if (r.status === 'active') map[id].active_count++
  }

  return Object.values(map)
    .sort((a, b) => b.total_earned - a.total_earned)
    .slice(0, limit)
}
