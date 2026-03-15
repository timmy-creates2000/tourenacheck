/**
 * @file utils.js
 * Pure utility functions used across the Tourena frontend.
 * No side effects — all functions are stateless and importable anywhere.
 */

import { CURRENCY_RATES, COUNTRIES } from './constants'
import { format, formatDistanceToNow, isPast } from 'date-fns'

/**
 * Convert TC (TournaCoin) to fiat amount.
 * @param {number} tc - Amount in TC
 * @param {string} currency - ISO currency code (e.g. 'NGN', 'USD')
 * @returns {number} Fiat amount
 */
export function tcToFiat(tc, currency = 'NGN') {
  const rate = CURRENCY_RATES[currency]?.rate ?? 100
  return tc * rate
}

/**
 * Convert fiat amount to TC.
 * @param {number} fiat - Fiat amount
 * @param {string} currency - ISO currency code
 * @returns {number} TC amount
 */
export function fiatToTc(fiat, currency = 'NGN') {
  const rate = CURRENCY_RATES[currency]?.rate ?? 100
  return fiat / rate
}

/**
 * Format a fiat amount with currency symbol and 2 decimal places.
 * @param {number} amount
 * @param {string} currency - ISO currency code
 * @returns {string} e.g. "₦1,500.00"
 */
export function formatFiat(amount, currency = 'NGN') {
  const { symbol } = CURRENCY_RATES[currency] ?? { symbol: '₦' }
  return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format a TC amount with locale-aware number formatting.
 * @param {number} amount
 * @returns {string} e.g. "1,500 TC"
 */
export function formatTC(amount) {
  return `${Number(amount).toLocaleString()} TC`
}

/**
 * Generate a random 8-character uppercase referral code.
 * Note: The DB trigger generates codes server-side; this is a client-side fallback.
 * @returns {string}
 */
export function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

/**
 * Get the flag emoji for a country code.
 * @param {string} code - ISO 3166-1 alpha-2 country code
 * @returns {string} Flag emoji or '🌍' fallback
 */
export function getCountryFlag(code) {
  return COUNTRIES.find(c => c.code === code)?.flag ?? '🌍'
}

/**
 * Get the full country name for a country code.
 * @param {string} code - ISO 3166-1 alpha-2 country code
 * @returns {string} Country name or the code itself as fallback
 */
export function getCountryName(code) {
  return COUNTRIES.find(c => c.code === code)?.name ?? code
}

/**
 * Format a date string as "Jan 1, 2025".
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy')
}

/**
 * Format a date string as "Jan 1, 2025 · 3:00 PM".
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy · h:mm a')
}

/**
 * Return a human-readable relative time string (e.g. "3 hours ago").
 * @param {string|Date} date
 * @returns {string}
 */
export function timeAgo(date) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

/**
 * Check if a deadline date has already passed.
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isDeadlinePassed(date) {
  if (!date) return false
  return isPast(new Date(date))
}

/**
 * Get the time remaining until a future date, broken into components.
 * Returns null if the date has already passed.
 * @param {string|Date} date
 * @returns {{ days: number, hours: number, minutes: number, seconds: number, diff: number } | null}
 */
export function getTimeRemaining(date) {
  if (!date) return null
  const diff = new Date(date) - new Date()
  if (diff <= 0) return null
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds, diff }
}

/**
 * Truncate a string to n characters, appending "…" if truncated.
 * @param {string} str
 * @param {number} n - Max length (default 30)
 * @returns {string}
 */
export function truncate(str, n = 30) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

/**
 * Calculate win rate as a percentage (0–100).
 * @param {number} won - Tournaments won
 * @param {number} played - Tournaments played
 * @returns {number}
 */
export function winRate(won, played) {
  if (!played) return 0
  return Math.round((won / played) * 100)
}

/**
 * Generate a unique transaction reference string.
 * Format: TRN-{timestamp}-{random}
 * @returns {string}
 */
export function uniqueRef() {
  return `TRN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

/**
 * Merge class names, filtering out falsy values.
 * @param {...string} classes
 * @returns {string}
 */
export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Returns a 1–5 star rating based on win rate and experience.
 * Used on player profiles and tournament cards.
 *
 * Star thresholds:
 * - 5 stars: 50+ games, 60%+ win rate
 * - 4 stars: 25+ games, 50%+ win rate
 * - 3 stars: 10+ games, 35%+ win rate
 * - 2 stars: 3+ games played
 * - 1 star: newcomer
 *
 * @param {number} won - Tournaments won
 * @param {number} played - Tournaments played
 * @returns {number} Star rating 1–5
 */
export function getPlayerStars(won = 0, played = 0) {
  if (played === 0) return 1
  const wr = won / played
  if (played >= 50 && wr >= 0.6) return 5
  if (played >= 25 && wr >= 0.5) return 4
  if (played >= 10 && wr >= 0.35) return 3
  if (played >= 3) return 2
  return 1
}

/**
 * Returns streak tier display info based on current win streak.
 * Returns null if streak is 0.
 *
 * @param {number} streak - Current win streak count
 * @returns {{ label: string, color: string, bg: string, icon: string } | null}
 */
export function getStreakTier(streak = 0) {
  if (streak >= 10) return { label: 'Legendary', color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-500/40', icon: '🔥' }
  if (streak >= 5)  return { label: 'Unstoppable', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40', icon: '🔥' }
  if (streak >= 3)  return { label: 'On Fire', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40', icon: '🔥' }
  if (streak >= 1)  return { label: 'Winning', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚡' }
  return null
}
