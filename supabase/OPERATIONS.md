# Tourena — Operations & Implementation Guide

> Last updated: March 2026  
> Stack: React 18 + Vite + Supabase + Flutterwave + Tailwind CDN

---

## 1. Project Structure

```
tourena/
├── index.html                  # Entry point — Tailwind CDN, Inter font, favicon
├── vite.config.js              # Vite config
├── .env                        # Supabase keys (never commit)
├── .env.example                # Template for env vars
├── public/
│   ├── favicon.svg             # Tourena icon (purple lightning bolt)
│   └── icons.svg               # Sprite sheet
├── image/
│   ├── tourena-icon.png        # App icon (PNG version)
│   └── horizontal-tourena-for wide-screen.png
├── src/
│   ├── main.jsx                # React root
│   ├── App.jsx                 # Router, guards, layout
│   ├── index.css               # Global styles
│   ├── App.css
│   ├── context/
│   │   └── AuthContext.jsx     # Auth state, profile, signIn/Out/Google
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx      # Sticky nav, role-aware links, DM badge
│   │   │   └── PageWrapper.jsx # Max-width container with padding
│   │   ├── tournament/
│   │   │   ├── TournamentCard.jsx
│   │   │   └── WinnerSpotlight.jsx
│   │   └── ui/
│   │       ├── Avatar.jsx      # User avatar + verified badge
│   │       ├── Badge.jsx
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── CountdownTimer.jsx
│   │       ├── GiftCoinModal.jsx
│   │       ├── Input.jsx       # Input, Textarea, Select
│   │       ├── Modal.jsx
│   │       ├── NotificationPanel.jsx + NotificationBell
│   │       ├── ReportButton.jsx
│   │       └── Skeleton.jsx
│   ├── hooks/
│   │   ├── useNotifications.js # Load + realtime notifications
│   │   ├── useRealtime.js      # Generic realtime subscription
│   │   └── useTournament.js    # Load tournament + realtime
│   ├── lib/
│   │   ├── supabase.js         # Supabase client
│   │   ├── constants.js        # All platform constants
│   │   ├── utils.js            # Formatting + calculation helpers
│   │   ├── badges.js           # Badge award logic
│   │   ├── games.js            # 150+ games library
│   │   ├── referrals.js        # Referral activation + bonus
│   │   └── flutterwave.js      # Payment integration
│   └── pages/
│       ├── auth/               # Login, Signup, ForgotPassword, ResetPassword, AccountPending
│       ├── player/             # Discover, TournamentDetail, MyTournamentsPlayer, Leaderboard
│       ├── organizer/          # MyTournaments, CreateTournament, ManageTournament, Analytics
│       ├── shared/             # Wallet, Referrals, ProfileSettings, PublicProfile,
│       │                       # Messages, Communities, CommunityDetail, Groups, GroupDetail,
│       │                       # NewsPage, EventsPage, Search
│       ├── admin/              # Dashboard, Revenue, EarningsFlow, Users, Tournaments,
│       │                       # Withdrawals, Transactions, Settings, Sponsors, Events,
│       │                       # News, Communities, Reports
│       └── moderator/          # Dashboard, Tournaments, Users, Reports, Communities, News
└── supabase/
    ├── schema.sql              # Full DB schema — run fresh to reset
    └── OPERATIONS.md           # This file
```

---

## 2. Environment Setup

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
```

**Never use the service role key in frontend code.**

---

## 3. Database Setup (Fresh Install)

1. Open Supabase SQL Editor
2. Paste entire `supabase/schema.sql` and run
3. This will:
   - Drop all existing policies (safe re-run)
   - Create all tables, triggers, RPCs, RLS policies
   - Insert default `platform_settings` rows
4. Create your admin user via Signup
5. In SQL Editor, promote to admin:
   ```sql
   update public.users set is_admin = true, account_status = 'approved' where email = 'your@email.com';
   ```
6. Create storage buckets in Supabase dashboard (all public):
   - `avatars`
   - `thumbnails`
   - `banners`
   - `media`

---

## 4. User Roles & Account Flow

| Role | Description |
|------|-------------|
| `player` | Default role. Can join tournaments, earn TC, withdraw |
| `organizer` | Can create/manage tournaments, earn from entry fees |
| `is_admin = true` | Full platform access, all admin pages |
| `is_moderator = true` | Partial access based on `moderator_permissions` jsonb |

### Account Status Flow
```
signup → pending → approved (by admin/mod) → active
                 → rejected (with reason)
                 → suspended
```

Players can be approved individually by admin.  
Organizers require manual approval — bulk approve available in AdminUsers.

### Moderator Permissions (jsonb keys, all boolean)
```json
{
  "review_tournaments": true,
  "manage_users": true,
  "manage_reports": true,
  "manage_communities": true,
  "manage_news": true
}
```

---

## 5. TournaCoin (TC) Economy

### Exchange Rates (1 TC = X fiat)
| Currency | Rate |
|----------|------|
| NGN | ₦10 |
| USD | $0.006 |
| GHS | ₵0.09 |
| KES | KSh 0.8 |

### Coin Flow
```
Player buys TC (fiat → TC)
  └─ Flutterwave deposit fee charged to player (1.4% NGN, 3.8% international)
  └─ Tourena receives net fiat → credits TC to player balance

Player enters tournament
  └─ entry_fee_tc debited from balance
  └─ prize_pool_tc credited to winner(s)
  └─ Tourena keeps spread (entry fees − prizes)

Practice tournament
  └─ Flat 5 TC platform fee on publish (deducted from organizer)
  └─ Recorded as practice_fee in platform_revenue

Player withdraws TC
  └─ 5% Tourena commission deducted first
  └─ Remaining TC converted to fiat
  └─ Flutterwave transfer fee deducted (1.4% NGN capped ₦2,000 / 3.8% international)
  └─ Player receives net fiat
```

### Minimums
- Minimum deposit: **10 TC**
- Minimum withdrawal: **15 TC**

### Flutterwave Fees
| Type | NGN | International |
|------|-----|---------------|
| Deposit (charged to player) | 1.4%, cap ₦2,000 | 3.8% |
| Transfer/payout (paid by Tourena) | 1.4%, cap ₦2,000 | 3.8% |

---

## 6. VIP Tiers

Computed client-side from lifetime TC purchased (not stored in DB).

| Tier | Min TC | Referral Bonus | Withdrawal Discount |
|------|--------|----------------|---------------------|
| Bronze | 500 | 3% | 0% |
| Silver | 2,000 | 4% | 0% |
| Gold | 10,000 | 5% | 0% |
| Platinum | 50,000 | 6% | 1% |
| Diamond | 200,000 | 8% | 2% |

Helper: `getVipTier(lifetimeTcPurchased)` in `constants.js`

---

## 7. Referral System

- Each user gets a unique `referral_code` (8-char uppercase) on signup
- Referral link: `https://tourena.app/signup?ref=CODE`
- Referral is activated when referred user joins their first tournament
- Referrer earns a % of every TC purchase the referred user makes (for 30 days)
- Bonus rate = VIP tier rate (3–8%)
- Top referrers leaderboard available on `/referrals` page

### Key functions (`referrals.js`)
- `activateReferral(referredUserId)` — call on first tournament join
- `processReferralBonus(referredUserId, purchaseAmountTc)` — call on every TC purchase
- `getTopReferrers(limit)` — platform-wide leaderboard

---

## 8. Tournament Lifecycle

```
draft → pending_review → approved → published → ongoing → completed
                       → rejected (with review_notes)
                       → cancelled
```

### Practice Tournaments
- `is_practice = true`
- No prize pool, no entry fee
- Flat 5 TC platform fee charged to organizer on publish
- Recorded in `platform_revenue` as `practice_fee`

### Organizer Earnings
- Enabled via `organizer_earnings_enabled = true`
- Earnings = entry fees collected − prize pool
- No upfront fee — Tourena takes 5% commission on withdrawal only
- Stored in `organizer_earnings_tc` on the tournament row

### Prize Distribution Options
- `winner_all` — 100% to winner
- `top2` — split between top 2
- `top3` — split between top 3
- `custom` — custom % stored in `prize_distribution_data` jsonb

---

## 9. Communities & Groups

### Communities (organizer-created)
- Public or private
- Private communities require join request approval
- Members can post, like, comment
- Owner can assign moderator role to members
- Admin/mod can suspend communities

### Groups (player-created)
- Max 50 members by default
- Private groups use invite codes (8-char uppercase, auto-generated)
- Private groups also support join requests
- Real-time group chat via `group_messages`

### Join Request Flow
1. User clicks "Request to Join" on private community/group
2. Request stored in `community_join_requests` / `group_join_requests`
3. Owner/moderator sees pending requests in Approval tab
4. On approve → user added to members table
5. On reject → request marked rejected

---

## 10. Messaging

- Direct messages between any two users
- Conversations stored in `conversations` (unique pair)
- Messages in `direct_messages`
- Unread count shown in Navbar (real-time)
- Group chat in `group_messages`

---

## 11. Notifications

Types: `coin_gift`, `coin_grant`, `tournament_approved`, `tournament_rejected`, `tournament_start`, `match_ready`, `prize_awarded`, `withdrawal_processed`, `withdrawal_failed`, `new_follower`, `community_invite`, `group_invite`, `dm_received`, `mention`, `system`

Triggered by:
- `send_coin_gift()` RPC → notifies receiver
- `admin_grant_coins()` RPC → notifies user
- Tournament status changes → organizer notified
- Withdrawal status changes → user notified

---

## 12. Admin Pages

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | AdminDashboard | Live stats, recent activity |
| `/admin/revenue` | AdminRevenue | Fiat flow, TC sold, charts |
| `/admin/earnings-flow` | AdminEarningsFlow | Full money lifecycle waterfall |
| `/admin/users` | AdminUsers | Approve, suspend, change role, verify, adjust TC |
| `/admin/tournaments` | AdminTournaments | Review, approve, reject tournaments |
| `/admin/withdrawals` | AdminWithdrawals | Process/reject withdrawal requests |
| `/admin/transactions` | AdminTransactions | All coin transactions with filters |
| `/admin/communities` | AdminCommunities | Suspend/restore communities |
| `/admin/reports` | AdminReports | Review content reports |
| `/admin/sponsors` | AdminSponsors | Manage sponsor banners/ads |
| `/admin/events` | AdminEvents | Create/manage platform events |
| `/admin/news` | AdminNews | Create/publish news articles |
| `/admin/settings` | AdminSettings | Platform fee rates, Flutterwave settings |

### AdminUsers Special Actions
- **Bulk Approve** — approves all pending organizers at once (players excluded)
- **Send Promo TC** — grants TC to all approved / all organizers / all players
- **Change Role** — toggle player ↔ organizer per user
- **Adjust TC** — add/deduct TC with required reason (uses `admin_grant_coins` RPC)
- **Toggle Verify** — grant/revoke verified badge (blue checkmark)

### AdminEarningsFlow
Shows the complete money lifecycle in a waterfall:
1. Deposit side: gross fiat → Flutterwave deposit fee → net fiat received → TC credited
2. In-platform: entry fees → prizes paid → spread kept + practice fees + referral bonuses
3. Withdrawal side: gross request → 5% commission → Flutterwave transfer fee → player net
4. Summary: gross float → minus Flutterwave fees → net profit → 60/40 split

---

## 13. Moderator Pages

| Route | Permission Required | Page |
|-------|---------------------|------|
| `/mod` | `is_moderator` | ModeratorDashboard |
| `/mod/tournaments` | `review_tournaments` | ModTournaments |
| `/mod/users` | `manage_users` | ModUsers |
| `/mod/reports` | `manage_reports` | ModReports |
| `/mod/communities` | `manage_communities` | ModCommunities |
| `/mod/news` | `manage_news` | ModNews |

Moderator nav links are built dynamically from their permissions — they only see pages they have access to.

---

## 14. Leaderboard

4 tabs:
- **Top Players** — by tournaments won
- **Top Earners** — by total TC earned
- **Win Streaks** — by current win streak
- **Top Referrers** — by total TC earned via referrals

Stars system: `getPlayerStars(stats)` in `utils.js`  
Streak tiers: `getStreakTier(streak)` in `utils.js`

---

## 15. Games Library (`lib/games.js`)

150+ games across 6 platforms:
- Mobile, PC, Console, Cross-Platform, Board, Sports

Exports:
- `GAMES` — full array with `{ name, platform, category }`
- `GAME_NAMES` — flat string array
- `GAME_PLATFORMS` — unique platforms
- `GAME_CATEGORIES` — unique categories
- `getGamesByPlatform(platform)` — filter helper
- `getGamesByCategory(category)` — filter helper

Used in: CreateTournament (autocomplete), Discover (filter), Search (filter panel)

---

## 16. Verified Badge

- `is_verified` boolean on `users` table
- Admin can toggle via AdminUsers
- Shown as blue checkmark SVG in `Avatar.jsx` (`showVerified` prop)
- Shown on PublicProfile next to username
- Shown on Search player results

---

## 17. Sponsors

Placements: `banner`, `sidebar`, `discover`, `leaderboard`, `tournament_detail`

- Active sponsors with matching placement are shown on Discover page
- Priority field controls display order
- Supports image and/or video
- Date range (`starts_at` / `ends_at`) for scheduled campaigns

---

## 18. RPC Functions (Supabase)

| Function | Description |
|----------|-------------|
| `credit_coins(user_id, amount, type, description, ...)` | Add TC + log transaction |
| `debit_coins(user_id, amount, type, description, ...)` | Remove TC + log transaction |
| `adjust_coins(user_id, amount, reason)` | Admin balance adjustment |
| `send_coin_gift(sender_id, receiver_id, amount, message)` | Atomic gift with notification |
| `admin_grant_coins(admin_id, user_id, amount, reason)` | Admin grant with notification |

All RPCs are `security definer` — they bypass RLS and run as the DB owner.

---

## 19. RLS Policy Summary

| Table | Public Read | Own Write | Admin Override |
|-------|-------------|-----------|----------------|
| users | ✓ | ✓ | ✓ |
| tournaments | approved/ongoing/completed only | organizer | ✓ |
| coin_transactions | own only | — | ✓ |
| withdrawals | own only | own insert | ✓ |
| platform_revenue | — | insert only | ✓ |
| platform_settings | ✓ | — | ✓ |
| notifications | own only | — | — |
| reports | own insert | — | ✓ + mod |
| news | published only | — | ✓ + mod |
| sponsors/events | ✓ | — | ✓ |
| communities | public only | owner | ✓ + mod |
| groups | non-private | owner | ✓ |
| direct_messages | conversation participants | sender | — |
| group_messages | group members | member | — |

---

## 20. Known Bugs Fixed

| Bug | File | Fix |
|-----|------|-----|
| `organizer_earning` vs `organizer_earnings` in coin_transactions check | schema.sql | Fixed to `organizer_earnings` |
| `practice_fee` missing from coin_transactions type check | schema.sql | Added `practice_fee` |
| `gross_fiat` and `commission_tc` missing from withdrawals | schema.sql | Added as generated columns |
| `published` vs `is_published` in news query | NewsPage.jsx | Fixed to `is_published` |
| `published` vs `is_active` in events query | EventsPage.jsx | Fixed to `is_active` |
| `content` vs `body` in news display | NewsPage.jsx | Fixed to `body` |
| Unused `Link` import | NewsPage.jsx | Removed |
| Unused `formatDate` import | EventsPage.jsx | Removed |
| Moderators couldn't read unpublished news | schema.sql | Added `news_admin_mod_read` policy |
| Reporters couldn't read their own reports | schema.sql | Added `reports_own_read` policy |
| Favicon pointing to `/vite.svg` | index.html | Fixed to `/favicon.svg` |

---

## 21. Suggested Future Improvements

These are not yet implemented but worth considering:

1. **Email notifications** — Supabase Edge Functions to send emails on withdrawal processed, tournament approved, etc.
2. **Push notifications** — Web Push API for real-time alerts when app is in background
3. **Tournament bracket visualizer** — Visual bracket tree for single/double elimination
4. **Match dispute system** — Players can raise disputes on match results with screenshot upload
5. **Organizer payout schedule** — Automatic weekly/monthly payout instead of manual withdrawal
6. **Anti-fraud detection** — Flag suspicious withdrawal patterns (already has `fraud_threshold_tc` setting)
7. **Google OAuth** — Already wired in AuthContext, just needs Google Cloud Console setup
8. **Mobile app** — React Native with same Supabase backend
9. **Tournament spectator mode** — Live match updates for non-participants
10. **Affiliate/sponsor dashboard** — Let sponsors track their banner performance
11. **Rate limiting** — Supabase Edge Functions to rate-limit coin purchases and withdrawals
12. **KYC verification** — Identity verification before large withdrawals

---

## 22. Running the App

```bash
cd tourena
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

> Note: Tailwind is loaded via CDN (not the Vite plugin) due to peer dependency conflicts. This is intentional.
