# Tourena

Tourena is a SaaS tournament platform built for competitive gaming communities. It allows players to discover and join tournaments, organizers to create and manage them, and admins/moderators to oversee the entire platform. The platform uses a virtual coin system (TC — TournaCoin) for all transactions, with real-money withdrawals via Flutterwave.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (CDN via index.html) |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Payments | Flutterwave (coin purchases + withdrawals) |
| Routing | React Router v6 |
| Notifications | react-hot-toast |
| Date handling | date-fns |

---

## Project Structure

```
tourena/
├── index.html                  # Tailwind CDN, custom CSS variables
├── vite.config.js
├── .env                        # Supabase + Flutterwave keys (never commit)
├── .env.example                # Template for env vars
├── supabase/
│   ├── schema.sql              # Full database schema — run this fresh
│   └── OPERATIONS.md           # SQL operations guide for admins
└── src/
    ├── main.jsx                # App entry point
    ├── App.jsx                 # All routes + guards
    ├── index.css               # Global styles
    ├── App.css
    ├── context/
    │   └── AuthContext.jsx     # Auth state, profile, signIn/signOut
    ├── hooks/
    │   ├── useNotifications.js # Real-time notification hook
    │   ├── useRealtime.js      # Generic Supabase realtime hook
    │   └── useTournament.js    # Tournament data + actions hook
    ├── lib/
    │   ├── supabase.js         # Supabase client
    │   ├── constants.js        # App-wide constants (currencies, badges, etc.)
    │   ├── utils.js            # Pure utility functions
    │   ├── badges.js           # Badge award logic
    │   ├── referrals.js        # Referral activation + bonus logic
    │   └── flutterwave.js      # Payment integration helpers
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.jsx      # Top navigation bar
    │   │   └── PageWrapper.jsx # Page layout wrapper
    │   ├── tournament/
    │   │   ├── TournamentCard.jsx
    │   │   └── WinnerSpotlight.jsx
    │   └── ui/
    │       ├── Avatar.jsx
    │       ├── Badge.jsx
    │       ├── Button.jsx
    │       ├── Card.jsx
    │       ├── CountdownTimer.jsx
    │       ├── GiftCoinModal.jsx
    │       ├── Input.jsx
    │       ├── Modal.jsx
    │       ├── NotificationPanel.jsx
    │       ├── ReportButton.jsx
    │       └── Skeleton.jsx
    └── pages/
        ├── auth/               # Login, Signup, ForgotPassword, ResetPassword, AccountPending
        ├── player/             # Discover, TournamentDetail, MyTournamentsPlayer, Leaderboard
        ├── organizer/          # CreateTournament, ManageTournament, MyTournaments, Analytics
        ├── admin/              # Full admin suite (12 pages)
        ├── moderator/          # Moderator suite (6 pages)
        └── shared/             # Communities, Groups, Messages, Wallet, Referrals, Search, etc.
```

---

## User Roles

| Role | Description |
|------|-------------|
| `player` | Default role. Can discover/join tournaments, chat, gift coins, refer friends |
| `organizer` | Can create and manage tournaments, view analytics |
| `admin` | Full platform control. Set via `is_admin = true` in DB |
| `moderator` | Partial control based on `moderator_permissions` jsonb field |

Users sign up and choose their role (player or organizer). All accounts start as `pending` and must be approved by an admin before they can access the platform.

---

## Account Status Flow

```
signup → pending → approved (can use platform)
                 → rejected (shown rejection reason)
                 → suspended (access blocked)
```

---

## Coin System (TC — TournaCoin)

- All platform transactions use TC (TournaCoin)
- Players buy TC via Flutterwave (real money → TC)
- TC is used for: tournament entry fees, coin gifts, practice fees
- TC can be withdrawn back to real money (minus commission)
- Exchange rate is configurable per currency in `constants.js`

### Platform Fees
- Entry fee: configurable per tournament
- Platform fee: 5 TC per transaction (configurable in `platform_settings`)
- Withdrawal commission: 5% (configurable)
- Referral bonus: 3% of referred user's coin purchases for 30 days

---

## Tournament Flow

```
organizer creates → pending_approval → admin/mod approves → published
→ players register (pay entry fee) → ongoing → completed → prizes distributed
```

- Tournaments can be public or private (invite code)
- Practice tournaments are free and don't affect rankings
- Entry fees go into prize pool minus platform fee
- Organizer earns a configurable % of the prize pool

---

## Referral System

1. Every user gets a unique referral code on signup
2. New user enters referral code during signup → `referred_by` is set
3. Referral activates when the referred user completes their first tournament
4. Referrer earns 3% of every coin purchase the referred user makes for 30 days
5. After 30 days, referral status changes to `expired`

---

## Community & Group System

### Communities
- Public: anyone can join instantly
- Private: users submit a join request with a message; owner/mods approve or reject
- Owner can promote members to moderator role within the community
- Posts support pinning; members can report posts

### Groups
- Public: anyone can join instantly
- Private: join via request OR invite code (owner can share)
- Real-time group chat
- Owner can promote members to admin within the group
- Admins can remove members; owner can remove admins

---

## Moderator System

Moderators are regular users with `is_moderator = true` and a `moderator_permissions` jsonb object:

```json
{
  "review_tournaments": true,
  "manage_users": false,
  "manage_reports": true,
  "manage_communities": false,
  "manage_news": false
}
```

Each permission unlocks a specific moderator page. The navbar dynamically shows only the pages the moderator has access to.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-your-key
```

Never use the service role key in frontend code.

---

## Initial Setup

See `supabase/OPERATIONS.md` for the full step-by-step setup guide including:
- Running the schema
- Creating the auth trigger
- Backfilling existing users
- Creating storage buckets
- Making yourself admin
- Setting up Google OAuth

### Quick start

```bash
cd tourena
npm install
npm run dev
```

Open http://localhost:5173

---

## Storage Buckets

All buckets must be created as **public** in Supabase Storage:

| Bucket | Used for |
|--------|---------|
| `avatars` | User profile pictures |
| `thumbnails` | Tournament thumbnail images |
| `banners` | Community/group banner images |
| `media` | Sponsor images/videos, event images, news images |

---

## Admin Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/admin` | Platform stats, real-time overview |
| Users | `/admin/users` | Approve/reject/suspend users, grant coins |
| Tournaments | `/admin/tournaments` | Approve/reject tournaments |
| Withdrawals | `/admin/withdrawals` | Process/fail withdrawal requests |
| Revenue | `/admin/revenue` | Platform earnings breakdown |
| Transactions | `/admin/transactions` | All coin transactions |
| Communities | `/admin/communities` | Verify/suspend communities |
| Reports | `/admin/reports` | Review and action user reports |
| Sponsors | `/admin/sponsors` | Manage sponsor banners |
| Events | `/admin/events` | Manage platform events |
| News | `/admin/news` | Publish/manage news articles |
| Settings | `/admin/settings` | Platform fee configuration |

---

## Business Model

1. Platform fee on every tournament entry (default 5 TC)
2. Withdrawal commission (default 5%)
3. Organizer commission on prize pool (configurable per tournament)
4. Sponsored banner placements (sold to game companies/brands)
5. Premium features (future: verified badges, featured tournament slots)

---

## Deployment

### Quick Deploy to Vercel

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Set root directory to `tourena`
5. Add environment variables (see `.env.example`)
6. Click Deploy

For detailed deployment instructions, see [DEPLOYMENT.md](../DEPLOYMENT.md)

### Manual Build

```bash
npm run build  # outputs to dist/
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages)

### Production Checklist

- [ ] Set environment variables in hosting provider
- [ ] Run `MIGRATION_FRESH_START.sql` in production Supabase
- [ ] Create storage buckets (avatars, thumbnails, banners, media)
- [ ] Update Supabase auth redirect URLs
- [ ] Switch Flutterwave keys from test to live
- [ ] Create first admin account
- [ ] Test signup/login flow
- [ ] Test file uploads
- [ ] Test payment flow

---

## Key Design Decisions

- Tailwind is loaded via CDN in `index.html` to avoid the `@tailwindcss/vite` peer dependency conflict with the current Vite version
- All DB mutations go through Supabase RPC functions (`credit_coins`, `debit_coins`, `send_coin_gift`, `admin_grant_coins`) to ensure atomic operations and proper audit trails
- RLS (Row Level Security) is enabled on all tables — users can only read/write their own data unless they are admin
- No service role key is used in the frontend; all privileged operations are done via SQL in the Supabase dashboard or via secure RPCs
- Account approval flow prevents spam accounts from accessing the platform

---

## Contributing / Handoff Notes

- All pages are self-contained React components with their own data fetching
- Shared state is minimal — only auth context is global
- To add a new role: add to `users.role` check type in schema, add nav links in `Navbar.jsx`, add route guard in `App.jsx`
- To add a new badge: add to `BADGES` array in `constants.js` and add condition in `badges.js`
- To add a new currency: add to `CURRENCY_RATES` in `constants.js`
- Platform settings (fees, commissions) are stored in the `platform_settings` table and editable from the admin UI
