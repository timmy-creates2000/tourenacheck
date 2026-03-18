export const CURRENCY_RATES = {
  NGN: { rate: 100,   symbol: '₦',   label: 'Nigerian Naira' },
  USD: { rate: 0.10,  symbol: '$',   label: 'US Dollar' },
  GBP: { rate: 0.08,  symbol: '£',   label: 'British Pound' },
  EUR: { rate: 0.09,  symbol: '€',   label: 'Euro' },
  GHS: { rate: 1.5,   symbol: '₵',   label: 'Ghanaian Cedi' },
  KES: { rate: 13,    symbol: 'KSh', label: 'Kenyan Shilling' },
}

/**
 * Flutterwave transfer fee rates per currency.
 * domestic_pct: % fee for local transfers (NGN)
 * domestic_cap_fiat: max fee cap in local currency (NGN only)
 * international_pct: % fee for cross-border transfers
 * flat_fiat: flat fee added on top (international)
 *
 * Source: Flutterwave pricing (March 2026)
 */
export const FLW_FEES = {
  NGN: { domestic_pct: 0.014, domestic_cap_fiat: 2000, international_pct: null, flat_fiat: 0 },
  USD: { domestic_pct: null,  domestic_cap_fiat: null,  international_pct: 0.038, flat_fiat: 0 },
  GBP: { domestic_pct: null,  domestic_cap_fiat: null,  international_pct: 0.038, flat_fiat: 0 },
  EUR: { domestic_pct: null,  domestic_cap_fiat: null,  international_pct: 0.038, flat_fiat: 0 },
  GHS: { domestic_pct: 0.02,  domestic_cap_fiat: null,  international_pct: null,  flat_fiat: 0 },
  KES: { domestic_pct: 0.02,  domestic_cap_fiat: null,  international_pct: null,  flat_fiat: 0 },
}

/**
 * Calculate the Flutterwave transfer fee for a given fiat amount and currency.
 * @param {number} fiatAmount - Amount in fiat
 * @param {string} currency - ISO currency code
 * @returns {number} Fee in fiat
 */
export function calcFlwFee(fiatAmount, currency = 'NGN') {
  const f = FLW_FEES[currency]
  if (!f) return 0
  const pct = f.domestic_pct ?? f.international_pct ?? 0
  let fee = fiatAmount * pct + (f.flat_fiat ?? 0)
  if (f.domestic_cap_fiat) fee = Math.min(fee, f.domestic_cap_fiat)
  return Math.round(fee * 100) / 100
}

export const COIN_PACKAGES = [
  { tc: 100,   label: '100 TC' },
  { tc: 500,   label: '500 TC' },
  { tc: 1000,  label: '1,000 TC' },
  { tc: 5000,  label: '5,000 TC' },
  { tc: 10000, label: '10,000 TC' },
  { tc: 0,     label: 'Custom', custom: true, min: 10 },
]

export const TOURNAMENT_FORMATS = [
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'round_robin',        label: 'Round Robin' },
  { value: 'custom',             label: 'Custom' },
]

export const TOURNAMENT_MODES = [
  { value: 'solo',          label: 'Solo 1v1' },
  { value: 'team',          label: 'Team' },
  { value: 'battle_royale', label: 'Battle Royale' },
  { value: 'free_for_all',  label: 'Free For All' },
  { value: 'custom',        label: 'Custom' },
]

export const GAME_TYPES = [
  { value: 'mobile',  label: 'Mobile' },
  { value: 'console', label: 'Console' },
  { value: 'pc',      label: 'PC' },
  { value: 'board',   label: 'Board Game' },
  { value: 'sports',  label: 'Sports' },
  { value: 'other',   label: 'Other' },
]

export const MAX_PARTICIPANTS_OPTIONS = [4, 8, 16, 32, 64, 128]

export const PRIZE_DISTRIBUTIONS = [
  { value: 'winner_all', label: 'Winner Takes All' },
  { value: 'top2',       label: 'Top 2' },
  { value: 'top3',       label: 'Top 3' },
  { value: 'custom',     label: 'Custom %' },
]

export const CHAT_PLATFORMS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord',  label: 'Discord' },
  { value: 'other',    label: 'Other' },
]

export const BADGES = [
  { type: 'first_blood',       name: 'First Blood',             icon: '🩸', description: 'Win your first tournament',              rare: false },
  { type: 'double_tap',        name: 'Double Tap',              icon: '⚡', description: 'Win 2 tournaments',                      rare: false },
  { type: 'hat_trick',         name: 'Hat Trick',               icon: '🎩', description: 'Win 3 tournaments',                      rare: false },
  { type: 'champion',          name: 'Champion',                icon: '🏆', description: 'Win 5 tournaments',                      rare: false },
  { type: 'legend',            name: 'Legend',                  icon: '👑', description: 'Win 10 tournaments',                     rare: true  },
  { type: 'battle_ready',      name: 'Battle Ready',            icon: '🎮', description: 'Play 10 tournaments',                    rare: false },
  { type: 'veteran',           name: 'Veteran',                 icon: '🛡️', description: 'Play 25 tournaments',                    rare: false },
  { type: 'elite',             name: 'Elite',                   icon: '💎', description: 'Play 50 tournaments',                    rare: true  },
  { type: 'coin_collector',    name: 'Coin Collector',          icon: '🪙', description: 'Earn 1,000 TC',                          rare: false },
  { type: 'high_roller',       name: 'High Roller',             icon: '💰', description: 'Earn 10,000 TC',                         rare: true  },
  { type: 'practice_perfect',  name: 'Practice Makes Perfect',  icon: '🎯', description: 'Complete 3 practice tournaments',        rare: false },
  { type: 'streak_master',     name: 'Streak Master',           icon: '🔥', description: 'Achieve 3 win streak',                   rare: false },
  { type: 'unstoppable',       name: 'Unstoppable',             icon: '⚡', description: 'Achieve 5 win streak',                   rare: false },
  { type: 'top_organizer',     name: 'Top Organizer',           icon: '🎪', description: 'Host 5 tournaments',                     rare: false },
  { type: 'community_builder', name: 'Community Builder',       icon: '🌍', description: 'Host tournament with 50+ participants',  rare: false },
]

export const STATUS_COLORS = {
  draft:            'bg-gray-600 text-gray-200',
  pending_approval: 'bg-yellow-600 text-yellow-100',
  approved:         'bg-blue-600 text-blue-100',
  published:        'bg-purple-600 text-purple-100',
  ongoing:          'bg-amber-600 text-amber-100',
  completed:        'bg-green-600 text-green-100',
  rejected:         'bg-red-600 text-red-100',
  cancelled:        'bg-red-700 text-red-100',
  pending:          'bg-yellow-600 text-yellow-100',
  active:           'bg-green-600 text-green-100',
  suspended:        'bg-red-600 text-red-100',
}

export const TX_TYPE_COLORS = {
  purchase:                          'bg-purple-600 text-purple-100',
  entry_fee:                         'bg-red-600 text-red-100',
  prize:                             'bg-amber-500 text-amber-100',
  practice_fee:                      'bg-gray-600 text-gray-200',
  player_withdrawal_commission:      'bg-orange-600 text-orange-100',
  organizer_withdrawal_commission:   'bg-orange-600 text-orange-100',
  referral_bonus:                    'bg-teal-600 text-teal-100',
  organizer_earnings:                'bg-green-600 text-green-100',
  refund:                            'bg-blue-600 text-blue-100',
  withdrawal:                        'bg-orange-600 text-orange-100',
  admin_grant:                       'bg-violet-600 text-violet-100',
  admin_deduct:                      'bg-rose-700 text-rose-100',
  gift_sent:                         'bg-pink-600 text-pink-100',
  gift_received:                     'bg-pink-500 text-pink-100',
}

// Enforced in UI and backend
export const MIN_DEPOSIT_TC    = 10
export const MIN_WITHDRAWAL_TC = 15
export const PLATFORM_FEE_TC   = 5
export const WITHDRAWAL_COMMISSION = 0.05
export const REFERRAL_PERCENT  = 0.03
export const REFERRAL_DAYS     = 30

/**
 * VIP tiers based on total TC purchased (lifetime).
 * Benefits stack — higher tier includes all lower tier benefits.
 *
 * Tier thresholds (total TC ever purchased):
 * - Bronze:   500+ TC
 * - Silver:   2,000+ TC
 * - Gold:     10,000+ TC
 * - Platinum: 50,000+ TC
 * - Diamond:  200,000+ TC
 */
export const VIP_TIERS = [
  {
    tier: 'diamond',
    label: 'Diamond',
    minTc: 200000,
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/15 border-cyan-500/40',
    badge: 'bg-cyan-500/20 text-cyan-300',
    icon: '💎',
    referralBonus: 0.08,   // 8% referral bonus (vs base 3%)
    withdrawalDiscount: 0.02, // 2% off commission
    benefits: ['8% referral bonus', '2% withdrawal discount', 'Priority support', 'Exclusive tournaments', 'Diamond badge'],
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    minTc: 50000,
    color: 'text-violet-300',
    bg: 'bg-violet-500/15 border-violet-500/40',
    badge: 'bg-violet-500/20 text-violet-300',
    icon: '🔮',
    referralBonus: 0.06,
    withdrawalDiscount: 0.01,
    benefits: ['6% referral bonus', '1% withdrawal discount', 'Priority support', 'Platinum badge'],
  },
  {
    tier: 'gold',
    label: 'Gold',
    minTc: 10000,
    color: 'text-amber-300',
    bg: 'bg-amber-500/15 border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300',
    icon: '🥇',
    referralBonus: 0.05,
    withdrawalDiscount: 0,
    benefits: ['5% referral bonus', 'Gold badge', 'Early access to tournaments'],
  },
  {
    tier: 'silver',
    label: 'Silver',
    minTc: 2000,
    color: 'text-slate-300',
    bg: 'bg-slate-500/15 border-slate-500/40',
    badge: 'bg-slate-500/20 text-slate-300',
    icon: '🥈',
    referralBonus: 0.04,
    withdrawalDiscount: 0,
    benefits: ['4% referral bonus', 'Silver badge'],
  },
  {
    tier: 'bronze',
    label: 'Bronze',
    minTc: 500,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15 border-orange-500/40',
    badge: 'bg-orange-500/20 text-orange-400',
    icon: '🥉',
    referralBonus: 0.03,
    withdrawalDiscount: 0,
    benefits: ['3% referral bonus', 'Bronze badge'],
  },
]

/**
 * Get VIP tier for a user based on their lifetime TC purchased.
 * @param {number} lifetimeTcPurchased
 * @returns {typeof VIP_TIERS[0] | null}
 */
export function getVipTier(lifetimeTcPurchased = 0) {
  return VIP_TIERS.find(t => lifetimeTcPurchased >= t.minTc) ?? null
}

/**
 * Get the referral bonus rate for a user based on their VIP tier.
 * Falls back to base REFERRAL_PERCENT if no VIP tier.
 * @param {number} lifetimeTcPurchased
 * @returns {number} bonus rate (e.g. 0.05 = 5%)
 */
export function getReferralBonusRate(lifetimeTcPurchased = 0) {
  const tier = getVipTier(lifetimeTcPurchased)
  return tier?.referralBonus ?? REFERRAL_PERCENT
}

export const COUNTRIES = [
  { code: 'NG', name: 'Nigeria',        flag: '🇳🇬' },
  { code: 'US', name: 'United States',  flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'GH', name: 'Ghana',          flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya',          flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa',   flag: '🇿🇦' },
  { code: 'DE', name: 'Germany',        flag: '🇩🇪' },
  { code: 'FR', name: 'France',         flag: '🇫🇷' },
  { code: 'CA', name: 'Canada',         flag: '🇨🇦' },
  { code: 'AU', name: 'Australia',      flag: '🇦🇺' },
  { code: 'IN', name: 'India',          flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil',         flag: '🇧🇷' },
  { code: 'OTHER', name: 'Other',       flag: '🌍' },
]
