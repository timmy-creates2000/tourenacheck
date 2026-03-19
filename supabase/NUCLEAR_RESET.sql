-- ============================================================
-- TOURENA — NUCLEAR RESET
-- Drops EVERYTHING and rebuilds from scratch.
-- Run this when you have schema conflicts from old runs.
-- YOU WILL LOSE ALL DATA — only run on a fresh/dev project.
-- ============================================================

-- ============================================================
-- PART 1: DROP EVERYTHING
-- ============================================================

-- Drop all triggers first
drop trigger if exists on_auth_user_created on auth.users;

-- Drop all functions
drop function if exists public.handle_new_user() cascade;
drop function if exists public.credit_coins(uuid,numeric,text,text,numeric,text,text,uuid,uuid) cascade;
drop function if exists public.debit_coins(uuid,numeric,text,text,uuid,uuid) cascade;
drop function if exists public.send_coin_gift(uuid,uuid,numeric,text) cascade;
drop function if exists public.admin_grant_coins(uuid,uuid,numeric,text) cascade;
drop function if exists public.approve_host_application(uuid,uuid) cascade;
drop function if exists public.approve_verified_organizer_application(uuid,uuid) cascade;
drop function if exists public.approve_tournament(uuid,uuid) cascade;
drop function if exists public.reject_tournament(uuid,uuid,text) cascade;

-- Drop all tables (cascade handles foreign keys)
drop table if exists public.audit_log cascade;
drop table if exists public.organizer_game_registrations cascade;
drop table if exists public.verified_organizer_applications cascade;
drop table if exists public.host_applications cascade;
drop table if exists public.team_invites cascade;
drop table if exists public.team_members cascade;
drop table if exists public.teams cascade;
drop table if exists public.group_join_requests cascade;
drop table if exists public.community_join_requests cascade;
drop table if exists public.platform_revenue cascade;
drop table if exists public.referrals cascade;
drop table if exists public.reports cascade;
drop table if exists public.follows cascade;
drop table if exists public.notifications cascade;
drop table if exists public.group_messages cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.community_comments cascade;
drop table if exists public.community_post_likes cascade;
drop table if exists public.community_posts cascade;
drop table if exists public.community_members cascade;
drop table if exists public.communities cascade;
drop table if exists public.direct_messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.platform_settings cascade;
drop table if exists public.coin_gifts cascade;
drop table if exists public.coin_transactions cascade;
drop table if exists public.withdrawals cascade;
drop table if exists public.brackets cascade;
drop table if exists public.matches cascade;
drop table if exists public.participants cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.player_badges cascade;
drop table if exists public.player_stats cascade;
drop table if exists public.game_tags cascade;
drop table if exists public.sponsors cascade;
drop table if exists public.events cascade;
drop table if exists public.news cascade;
drop table if exists public.users cascade;

-- ============================================================
-- PART 2: REBUILD ALL TABLES
-- ============================================================

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  display_name text,
  bio text check (char_length(bio) <= 300),
  avatar_url text,
  role text not null default 'player' check (role in ('player','organizer')),
  is_admin boolean not null default false,
  is_moderator boolean not null default false,
  moderator_permissions jsonb not null default '{}',
  is_host boolean not null default false,
  is_verified_organizer boolean not null default false,
  host_approved_at timestamptz,
  verified_organizer_approved_at timestamptz,
  approved_game_types text[] not null default '{}',
  trust_score int not null default 0 check (trust_score >= 0 and trust_score <= 100),
  gender text check (gender in ('male','female','non_binary','prefer_not_to_say')),
  favourite_game text,
  account_status text not null default 'approved' check (account_status in ('pending','approved','rejected','suspended')),
  rejection_reason text,
  country text,
  preferred_currency text not null default 'NGN',
  coin_balance numeric not null default 0,
  referral_code text unique,
  referred_by uuid references public.users(id),
  social_youtube text,
  social_twitter text,
  social_twitch text,
  is_verified boolean not null default false,
  is_online boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table public.game_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  game_name text not null,
  game_tag text not null,
  created_at timestamptz not null default now()
);

create table public.player_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users(id) on delete cascade,
  tournaments_played int not null default 0,
  tournaments_won int not null default 0,
  total_tc_earned numeric not null default 0,
  total_tc_spent numeric not null default 0,
  current_win_streak int not null default 0,
  longest_win_streak int not null default 0,
  total_opponents_faced int not null default 0,
  best_prize_tc numeric not null default 0,
  favourite_game text,
  favourite_mode text,
  last_active timestamptz,
  updated_at timestamptz not null default now()
);

create table public.player_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_type text not null,
  badge_name text not null,
  badge_description text,
  earned_at timestamptz not null default now(),
  tournament_id uuid,
  unique(user_id, badge_type)
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  game_name text not null,
  game_type text not null default 'other',
  thumbnail_url text,
  banner_url text,
  format text not null default 'single_elimination',
  mode text not null default 'solo',
  custom_mode_name text,
  team_size int,
  max_participants int not null default 16,
  current_participants int not null default 0,
  entry_fee_tc numeric not null default 0,
  prize_pool_tc numeric not null default 0,
  is_practice boolean not null default false,
  is_casual boolean not null default false,
  requires_approval boolean not null default true,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  prize_funded_by text default 'entry_fees',
  prize_distribution text default 'winner_all',
  prize_distribution_data jsonb,
  organizer_earnings_enabled boolean not null default false,
  organizer_earnings_tc numeric not null default 0,
  organizer_commission_tc numeric not null default 0,
  status text not null default 'draft',
  review_notes text,
  rejection_reason text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  is_public boolean not null default true,
  join_code text,
  room_code text,
  room_password text,
  room_revealed boolean not null default false,
  chat_group_link text,
  chat_platform text,
  platform_fee_tc numeric not null default 0,
  platform_fee_paid boolean not null default false,
  rules text,
  start_date timestamptz,
  end_date timestamptz,
  registration_deadline timestamptz,
  group_id uuid references public.groups(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  team_name text,
  game_tag text,
  status text not null default 'registered',
  placement int,
  registered_at timestamptz not null default now(),
  unique(tournament_id, user_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number int not null,
  match_number int not null,
  player1_id uuid references public.users(id),
  player2_id uuid references public.users(id),
  player1_score int,
  player2_score int,
  winner_id uuid references public.users(id),
  status text not null default 'pending',
  scheduled_time timestamptz,
  completed_at timestamptz
);

create table public.brackets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid unique not null references public.tournaments(id) on delete cascade,
  bracket_data jsonb,
  updated_at timestamptz not null default now()
);

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in (
    'purchase','prize','entry_fee','refund','withdrawal','gift_sent','gift_received',
    'admin_grant','admin_deduct','referral_bonus','organizer_earnings','practice_fee','platform_fee'
  )),
  amount_tc numeric not null,
  amount_fiat numeric,
  currency text,
  description text not null,
  tournament_id uuid references public.tournaments(id),
  related_user_id uuid references public.users(id),
  flutterwave_ref text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create table public.coin_gifts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  amount_tc numeric not null check (amount_tc > 0),
  message text check (char_length(message) <= 200),
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  withdrawal_type text not null,
  gross_tc numeric not null,
  tourena_commission_tc numeric not null,
  commission_tc numeric generated always as (tourena_commission_tc) stored,
  net_tc numeric not null,
  net_fiat numeric not null,
  flutterwave_transfer_fee_fiat numeric not null default 0,
  gross_fiat numeric generated always as (net_fiat + flutterwave_transfer_fee_fiat) stored,
  currency text not null default 'NGN',
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  status text not null default 'pending',
  flutterwave_transfer_ref text,
  admin_note text,
  created_at timestamptz not null default now()
);

create table public.platform_revenue (
  id uuid primary key default gen_random_uuid(),
  revenue_type text not null,
  amount_tc numeric not null,
  amount_fiat numeric,
  currency text,
  user_id uuid references public.users(id),
  tournament_id uuid references public.tournaments(id),
  withdrawal_id uuid references public.withdrawals(id),
  created_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  activated_at timestamptz,
  expires_at timestamptz,
  total_tc_earned numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(referrer_id, referred_id)
);

create table public.platform_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now(),
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.users(id) on delete cascade,
  participant_b uuid not null references public.users(id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique(participant_a, participant_b)
);last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique(participant_a, participant_b)
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text check (char_length(content) <= 2000),
  media_url text,
  media_type text check (media_type in ('image','video','file') or media_type is null),
  is_read boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  avatar_url text,
  banner_url text,
  game_focus text,
  is_public boolean not null default true,
  is_verified boolean not null default false,
  member_count int not null default 0,
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now()
);

create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  joined_at timestamptz not null default now(),
  unique(community_id, user_id)
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(content) <= 3000),
  media_url text,
  like_count int not null default 0,
  comment_count int not null default 0,
  is_pinned boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.community_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(content) <= 1000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  avatar_url text,
  is_private boolean not null default false,
  invite_code text unique default upper(substring(md5(random()::text) from 1 for 8)),
  max_members int not null default 50,
  member_count int not null default 1,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text check (char_length(content) <= 2000),
  media_url text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);
  type text not null check (type in (
    'coin_gift','coin_grant','tournament_approved','tournament_rejected',
    'tournament_start','match_ready','prize_awarded','withdrawal_processed',
    'withdrawal_failed','new_follower','community_invite','group_invite',
    'dm_received','mention','system',
    'host_approved','host_rejected','verified_organizer_approved','verified_organizer_rejected'
  )),coin_gift','coin_grant','tournament_approved','tournament_rejected',
    'tournament_start','match_ready','prize_awarded','withdrawal_processed',
    'withdrawal_failed','new_follower','community_invite','group_invite',
    'dm_received','mention','system'
  )),
  title text not null,
  body text,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('user','community','group','post','message','tournament')),
  target_id uuid not null,
  reason text not null check (reason in ('spam','harassment','inappropriate','cheating','other')),
  details text,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed','actioned')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  video_url text,
  link_url text,
  placement text not null default 'banner' check (placement in ('banner','sidebar','discover','leaderboard','tournament_detail')),
  is_active boolean not null default true,
  priority int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  video_url text,
  event_date timestamptz,
  location text,
  link_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  video_url text,
  link_url text,
  category text not null default 'general' check (category in ('general','tournament','update','esports','community')),
  is_featured boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  tag text not null check (char_length(tag) <= 6),
  avatar_url text,
  banner_url text,
  bio text check (char_length(bio) <= 300),
  game_focus text,
  is_recruiting boolean not null default false,
  max_members int not null default 10,
  member_count int not null default 1,
  tournaments_played int not null default 0,
  tournaments_won int not null default 0,
  status text not null default 'active' check (status in ('active','disbanded')),
  created_at timestamptz not null default now(),
  unique(name),
  unique(tag)
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('captain','member')),
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_by uuid not null references public.users(id) on delete cascade,
  invitee_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(team_id, invitee_id)
);

create table public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text check (char_length(message) <= 300),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(community_id, user_id)
);

create table public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text check (char_length(message) <= 300),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(group_id, user_id)
);
 
create table public.host_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  game_types text[] not null default '{}',
  experience text not null,
  game_credentials text not null,
  motivation text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id)
);

create table public.verified_organizer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  current_host_stats jsonb not null default '{}',
  business_info text,
  portfolio_url text,
  motivation text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id)
);

create table public.organizer_game_registrations (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  game_name text not null,
  game_credentials text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  registered_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.users(id)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  old_balance numeric not null,
  new_balance numeric not null,
  amount_changed numeric not null,
  reason text,
  performed_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- PART 3: PLATFORM SETTINGS (default values)
-- ============================================================
insert into public.platform_settings (key, value, description) values
  ('player_withdrawal_commission_pct', '5',     'Player withdrawal commission %'),
  ('organizer_withdrawal_commission_pct', '5',  'Organizer withdrawal commission %'),
  ('practice_platform_fee_tc', '5',             'Platform fee for practice tournaments (TC)'),
  ('referral_bonus_pct', '3',                   'Referral bonus % of referred user earnings'),
  ('referral_duration_days', '30',              'How long referral tracking lasts (days)'),
  ('min_deposit_tc', '10',                      'Minimum coin purchase amount (TC)'),
  ('min_withdrawal_tc', '15',                   'Minimum withdrawal amount (TC)'),
  ('fraud_threshold_tc', '10000',               'Withdrawals above this need manual review'),
  ('coin_gift_max_tc', '5000',                  'Max coins a user can gift per day'),
  ('flw_fee_ngn_pct', '0.014',                  'Flutterwave NGN transfer fee %'),
  ('flw_fee_ngn_cap', '2000',                   'Flutterwave NGN fee cap (fiat)'),
  ('flw_fee_international_pct', '0.038',        'Flutterwave international transfer fee %'),
  ('ngn_rate', '100',                           '1 TC = X NGN'),
  ('usd_rate', '0.10',                          '1 TC = X USD'),
  ('kes_rate', '13',                            '1 TC = X KES'),
  ('ghs_rate', '1.5',                           '1 TC = X GHS')
on conflict (key) do nothing;

-- ============================================================
-- PART 4: INDEXES
-- ============================================================
create index if not exists idx_coin_transactions_user_id    on public.coin_transactions(user_id);
create index if not exists idx_coin_transactions_type        on public.coin_transactions(type);
create index if not exists idx_coin_transactions_created_at  on public.coin_transactions(created_at desc);
create index if not exists idx_withdrawals_user_id           on public.withdrawals(user_id);
create index if not exists idx_withdrawals_status            on public.withdrawals(status);
create index if not exists idx_tournaments_organizer_id      on public.tournaments(organizer_id);
create index if not exists idx_tournaments_status            on public.tournaments(status);
create index if not exists idx_tournaments_approval_status   on public.tournaments(approval_status);
create index if not exists idx_tournaments_is_casual         on public.tournaments(is_casual);
create index if not exists idx_participants_tournament_id    on public.participants(tournament_id);
create index if not exists idx_participants_user_id          on public.participants(user_id);
create index if not exists idx_notifications_user_id         on public.notifications(user_id);
create index if not exists idx_follows_follower_id           on public.follows(follower_id);
create index if not exists idx_follows_following_id          on public.follows(following_id);
create index if not exists idx_host_applications_user_id     on public.host_applications(user_id);
create index if not exists idx_host_applications_status      on public.host_applications(status);
create index if not exists idx_verified_org_apps_user_id     on public.verified_organizer_applications(user_id);
create index if not exists idx_verified_org_apps_status      on public.verified_organizer_applications(status);
create index if not exists idx_game_registrations_org_id     on public.organizer_game_registrations(organizer_id);
create index if not exists idx_users_is_host                 on public.users(is_host);
create index if not exists idx_users_is_verified_organizer   on public.users(is_verified_organizer);

-- ============================================================
-- PART 5: AUTH TRIGGER — everyone auto-approved as player
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  insert into public.users (
    id, email, username, role, referral_code, account_status, coin_balance, preferred_currency
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'player',
    upper(substring(md5(random()::text) from 1 for 8)),
    'approved',
    0,
    'NGN'
  ) on conflict (id) do nothing;

  insert into public.player_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PART 6: RPC FUNCTIONS
-- ============================================================
create or replace function credit_coins(
  p_user_id uuid, p_amount numeric, p_type text, p_description text,
  p_fiat numeric default null, p_currency text default null, p_flw_ref text default null,
  p_tournament_id uuid default null, p_related_user_id uuid default null
) returns void language plpgsql security definer set search_path = public as $func$
begin
  update public.users set coin_balance = coin_balance + p_amount where id = p_user_id;
  insert into public.coin_transactions(user_id, type, amount_tc, amount_fiat, currency, description, tournament_id, related_user_id, flutterwave_ref, status)
  values (p_user_id, p_type, p_amount, p_fiat, p_currency, p_description, p_tournament_id, p_related_user_id, p_flw_ref, 'confirmed');
end;
$func$;

create or replace function debit_coins(
  p_user_id uuid, p_amount numeric, p_type text, p_description text,
  p_tournament_id uuid default null, p_related_user_id uuid default null
) returns void language plpgsql security definer set search_path = public as $func$
begin
  update public.users set coin_balance = coin_balance - p_amount where id = p_user_id;
  insert into public.coin_transactions(user_id, type, amount_tc, description, tournament_id, related_user_id, status)
  values (p_user_id, p_type, -p_amount, p_description, p_tournament_id, p_related_user_id, 'confirmed');
end;
$func$;

create or replace function send_coin_gift(
  p_sender_id uuid, p_receiver_id uuid, p_amount numeric, p_message text default null
) returns void language plpgsql security definer set search_path = public as $func$
declare v_sender_balance numeric;
begin
  select coin_balance into v_sender_balance from public.users where id = p_sender_id for update;
  if v_sender_balance < p_amount then raise exception 'Insufficient balance'; end if;

  update public.users set coin_balance = coin_balance - p_amount where id = p_sender_id;
  insert into public.coin_transactions(user_id, type, amount_tc, description, related_user_id, status)
  values (p_sender_id, 'gift_sent', -p_amount,
    coalesce('Gift to ' || (select username from public.users where id = p_receiver_id), 'Gift sent'),
    p_receiver_id, 'confirmed');

  update public.users set coin_balance = coin_balance + p_amount where id = p_receiver_id;
  insert into public.coin_transactions(user_id, type, amount_tc, description, related_user_id, status)
  values (p_receiver_id, 'gift_received', p_amount,
    coalesce('Gift from ' || (select username from public.users where id = p_sender_id), 'Gift received'),
    p_sender_id, 'confirmed');

  insert into public.coin_gifts(sender_id, receiver_id, amount_tc, message)
  values (p_sender_id, p_receiver_id, p_amount, p_message);

  insert into public.notifications(user_id, type, title, body, data)
  values (p_receiver_id, 'coin_gift', 'You received a coin gift!',
    (select username from public.users where id = p_sender_id) || ' sent you ' || p_amount || ' TC' || coalesce(': ' || p_message, ''),
create or replace function admin_grant_coins(
  p_admin_id uuid, p_user_id uuid, p_amount numeric, p_reason text
) returns void language plpgsql security definer set search_path = public as $func$
begin
  update public.users set coin_balance = coin_balance + p_amount where id = p_user_id;
  insert into public.coin_transactions(user_id, type, amount_tc, description, related_user_id, status)
  values (p_user_id, case when p_amount >= 0 then 'admin_grant' else 'admin_deduct' end,
    p_amount, p_reason, p_admin_id, 'confirmed');
  insert into public.notifications(user_id, type, title, body, data)
  values (p_user_id, 'coin_grant',
    case when p_amount >= 0 then 'Coins added to your wallet' else 'Coins deducted from your wallet' end,
    p_reason, jsonb_build_object('amount', p_amount, 'admin_id', p_admin_id));
end;
$func$;

create or replace function approve_host_application(
  p_admin_id uuid, p_application_id uuid
) returns void language plpgsql security definer set search_path = public as $func$
declare
  v_user_id uuid;
begin
  -- Get the applicant's user_id
  select user_id into v_user_id from public.host_applications where id = p_application_id;
  if v_user_id is null then raise exception 'Application not found'; end if;

  -- Mark application approved
  update public.host_applications
  set status = 'approved', reviewed_at = now(), reviewed_by = p_admin_id
  where id = p_application_id;

  -- Promote user to organizer / host
  update public.users
  set role = 'organizer', is_host = true
  where id = v_user_id;

  -- Notify the user
  insert into public.notifications(user_id, type, title, body, data)
  values (v_user_id, 'host_approved',
    'Host Application Approved!',
    'Congratulations! You can now host tournaments on Tourena.',
    jsonb_build_object('application_id', p_application_id));
end;
$func$;

create or replace function approve_verified_organizer_application(
  p_admin_id uuid, p_application_id uuid
) returns void language plpgsql security definer set search_path = public as $func$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.verified_organizer_applications where id = p_application_id;
  if v_user_id is null then raise exception 'Application not found'; end if;

  update public.verified_organizer_applications
  set status = 'approved', reviewed_at = now(), reviewed_by = p_admin_id
  where id = p_application_id;

  update public.users
  set is_verified_organizer = true
  where id = v_user_id;

  insert into public.notifications(user_id, type, title, body, data)
  values (v_user_id, 'verified_organizer_approved',
    'Verified Organizer Status Granted!',
    'You are now a Verified Organizer on Tourena.',
    jsonb_build_object('application_id', p_application_id));
end;
$func$;

create or replace function approve_tournament(
  p_admin_id uuid, p_tournament_id uuid
) returns void language plpgsql security definer set search_path = public as $func$
declare
  v_organizer_id uuid;
  v_title text;
begin
  select organizer_id, title into v_organizer_id, v_title
  from public.tournaments where id = p_tournament_id;
  if v_organizer_id is null then raise exception 'Tournament not found'; end if;

  update public.tournaments
  set approval_status = 'approved', status = 'upcoming',
      approved_at = now(), approved_by = p_admin_id
  where id = p_tournament_id;

  insert into public.notifications(user_id, type, title, body, data)
  values (v_organizer_id, 'tournament_approved',
    'Tournament Approved!',
    'Your tournament "' || v_title || '" has been approved and is now live.',
    jsonb_build_object('tournament_id', p_tournament_id));
end;
$func$;

create or replace function reject_tournament(
  p_admin_id uuid, p_tournament_id uuid, p_reason text
) returns void language plpgsql security definer set search_path = public as $func$
declare
  v_organizer_id uuid;
  v_title text;
begin
  select organizer_id, title into v_organizer_id, v_title
  from public.tournaments where id = p_tournament_id;
  if v_organizer_id is null then raise exception 'Tournament not found'; end if;

  update public.tournaments
  set approval_status = 'rejected', status = 'cancelled',
      rejection_reason = p_reason, approved_by = p_admin_id
  where id = p_tournament_id;

  insert into public.notifications(user_id, type, title, body, data)
  values (v_organizer_id, 'tournament_rejected',
    'Tournament Not Approved',
    'Your tournament "' || v_title || '" was not approved. Reason: ' || p_reason,
    jsonb_build_object('tournament_id', p_tournament_id, 'reason', p_reason));
end;
$func$;s (p_user_id, 'coin_grant',
    case when p_amount >= 0 then 'Coins added to your wallet' else 'Coins deducted from your wallet' end,
    p_reason, jsonb_build_object('amount', p_amount, 'admin_id', p_admin_id));
end;
$func$;

-- ============================================================
-- PART 7: ENABLE RLS ON ALL TABLES
-- ============================================================
alter table public.users enable row level security;
alter table public.game_tags enable row level security;
alter table public.player_stats enable row level security;
alter table public.player_badges enable row level security;
alter table public.tournaments enable row level security;
alter table public.participants enable row level security;
alter table public.matches enable row level security;
alter table public.brackets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.coin_gifts enable row level security;
alter table public.withdrawals enable row level security;
alter table public.platform_revenue enable row level security;
alter table public.referrals enable row level security;
alter table public.platform_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_comments enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;
alter table public.sponsors enable row level security;
alter table public.events enable row level security;
alter table public.news enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.host_applications enable row level security;
alter table public.verified_organizer_applications enable row level security;
alter table public.organizer_game_registrations enable row level security;
alter table public.audit_log enable row level security;
alter table public.community_join_requests enable row level security;
alter table public.group_join_requests enable row level security;
alter table public.team_invites enable row level security;

-- ============================================================
-- PART 8: RLS POLICIES
-- ============================================================

-- Drop ALL existing policies first (safe re-run)
do $drop$ declare pol record; begin
  for pol in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $drop$;

-- USERS
create policy "users_public_read"  on public.users for select using (true);
create policy "users_insert_own"   on public.users for insert with check (auth.uid() = id);
create policy "users_own_update"   on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users_admin_update" on public.users for update
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

-- GAME TAGS
create policy "game_tags_public_read" on public.game_tags for select using (true);
create policy "game_tags_own"         on public.game_tags using (auth.uid() = user_id);

-- PLAYER STATS
create policy "player_stats_public_read" on public.player_stats for select using (true);
create policy "player_stats_own_write"   on public.player_stats using (auth.uid() = user_id);

-- PLAYER BADGES
create policy "player_badges_public_read" on public.player_badges for select using (true);
create policy "player_badges_own_insert"  on public.player_badges for insert with check (auth.uid() = user_id);
create policy "player_badges_admin_all"   on public.player_badges using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

-- TOURNAMENTS
create policy "tournaments_public_read" on public.tournaments for select using (
  (approval_status = 'approved' and is_casual = false)
  or is_casual = true
  or organizer_id = auth.uid()
  or exists (select 1 from public.users u where u.id = auth.uid() and (u.is_admin = true or u.is_moderator = true))
);
create policy "tournaments_insert" on public.tournaments for insert with check (auth.uid() = organizer_id);
create policy "tournaments_update" on public.tournaments for update using (
  auth.uid() = organizer_id
  or exists (select 1 from public.users u where u.id = auth.uid() and (u.is_admin = true or u.is_moderator = true))
);

-- PARTICIPANTS
create policy "participants_public_read" on public.participants for select using (true);
create policy "participants_own"         on public.participants using (auth.uid() = user_id);
create policy "participants_admin"       on public.participants using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

-- MATCHES & BRACKETS
create policy "matches_public_read"  on public.matches for select using (true);
create policy "matches_admin"        on public.matches using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));
create policy "brackets_public_read" on public.brackets for select using (true);
create policy "brackets_admin"       on public.brackets using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

-- COIN TRANSACTIONS
create policy "coin_tx_own_read" on public.coin_transactions for select using (auth.uid() = user_id);
create policy "coin_tx_admin"    on public.coin_transactions for select using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

-- COIN GIFTS
create policy "coin_gifts_own"    on public.coin_gifts for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "coin_gifts_insert" on public.coin_gifts for insert with check (auth.uid() = sender_id);

-- WITHDRAWALS
create policy "withdrawals_own_read"   on public.withdrawals for select using (auth.uid() = user_id);
create policy "withdrawals_own_insert" on public.withdrawals for insert with check (auth.uid() = user_id);
create policy "withdrawals_admin"      on public.withdrawals using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

-- PLATFORM REVENUE
create policy "platform_revenue_admin" on public.platform_revenue using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

-- PLATFORM SETTINGS
create policy "platform_settings_public_read" on public.platform_settings for select using (true);
create policy "platform_settings_admin_write" on public.platform_settings using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

-- REFERRALS
create policy "referrals_own"    on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);
-- CONVERSATIONS & MESSAGES
create policy "conversations_select"   on public.conversations for select using (auth.uid() = participant_a or auth.uid() = participant_b);
create policy "conversations_insert"   on public.conversations for insert with check (auth.uid() = participant_a or auth.uid() = participant_b);
create policy "conversations_update"   on public.conversations for update using (auth.uid() = participant_a or auth.uid() = participant_b);
create policy "direct_messages_select" on public.direct_messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid()))
);
create policy "direct_messages_insert" on public.direct_messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid()))
);
create policy "direct_messages_update" on public.direct_messages for update using (auth.uid() = sender_id);() or c.participant_b = auth.uid()))
);
create policy "direct_messages_insert" on public.direct_messages for insert with check (auth.uid() = sender_id);
create policy "direct_messages_update" on public.direct_messages for update using (auth.uid() = sender_id);

-- COMMUNITIES
create policy "communities_public_read"  on public.communities for select using (is_public = true or exists (select 1 from public.community_members cm where cm.community_id = id and cm.user_id = auth.uid()));
create policy "communities_insert"       on public.communities for insert with check (auth.uid() = owner_id);
create policy "communities_owner_update" on public.communities for update using (auth.uid() = owner_id or exists (select 1 from public.users u where u.id = auth.uid() and (u.is_admin = true or u.is_moderator = true)));
create policy "community_members_read"   on public.community_members for select using (true);
create policy "community_members_own"    on public.community_members using (auth.uid() = user_id);
create policy "community_posts_read"     on public.community_posts for select using (true);
create policy "community_posts_own"      on public.community_posts using (auth.uid() = author_id);
create policy "community_post_likes_own" on public.community_post_likes using (auth.uid() = user_id);
create policy "community_comments_read"  on public.community_comments for select using (true);
create policy "community_comments_own"   on public.community_comments using (auth.uid() = author_id);

-- GROUPS
create policy "groups_read"         on public.groups for select using (is_private = false or exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid()));
create policy "groups_insert"       on public.groups for insert with check (auth.uid() = owner_id);
create policy "groups_owner_update" on public.groups for update using (auth.uid() = owner_id);
create policy "group_members_read"  on public.group_members for select using (true);
create policy "group_members_own"   on public.group_members using (auth.uid() = user_id);
create policy "group_messages_read" on public.group_messages for select using (exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()));
create policy "group_messages_own"  on public.group_messages using (auth.uid() = sender_id);

-- NOTIFICATIONS
create policy "notifications_own"    on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update" on public.notifications for update using (auth.uid() = user_id);

-- FOLLOWS
create policy "follows_public_read" on public.follows for select using (true);
create policy "follows_own"         on public.follows using (auth.uid() = follower_id);

-- REPORTS
create policy "reports_own_insert" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "reports_admin"      on public.reports using (exists (select 1 from public.users u where u.id = auth.uid() and (u.is_admin = true or u.is_moderator = true)));

-- SPONSORS / EVENTS / NEWS
create policy "sponsors_public_read" on public.sponsors for select using (is_active = true);
create policy "sponsors_admin"       on public.sponsors using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));
create policy "events_public_read"   on public.events for select using (is_active = true);
create policy "events_admin"         on public.events using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));
create policy "news_public_read"     on public.news for select using (is_published = true);
create policy "news_admin"           on public.news using (exists (select 1 from public.users u where u.id = auth.uid() and (u.is_admin = true or u.is_moderator = true)));

-- TEAMS
create policy "teams_public_read"    on public.teams for select using (true);
create policy "teams_captain_insert" on public.teams for insert with check (auth.uid() = captain_id);
create policy "teams_captain_update" on public.teams for update using (auth.uid() = captain_id);
create policy "teams_captain_delete" on public.teams for delete using (auth.uid() = captain_id);
create policy "team_members_read"    on public.team_members for select using (true);
create policy "team_members_write"   on public.team_members for insert with check (
  exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
  or auth.uid() = user_id
);
create policy "team_members_delete"  on public.team_members for delete using (
  auth.uid() = user_id
  or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
);
create policy "team_invites_read"    on public.team_invites for select using (
  auth.uid() = invitee_id or auth.uid() = invited_by
  or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
);
create policy "team_invites_insert"  on public.team_invites for insert with check (
  exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
);
create policy "team_invites_update"  on public.team_invites for update using (
  auth.uid() = invitee_id
  or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
);

-- HOST / VERIFIED ORG APPLICATIONS
create policy "host_apps_read"         on public.host_applications for select using (auth.uid() = user_id or exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));
create policy "host_apps_insert"       on public.host_applications for insert with check (auth.uid() = user_id);
create policy "host_apps_admin_update" on public.host_applications for update using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));
create policy "vorg_apps_read"         on public.verified_organizer_applications for select using (auth.uid() = user_id or exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));
create policy "vorg_apps_insert"       on public.verified_organizer_applications for insert with check (auth.uid() = user_id);
create policy "vorg_apps_admin_update" on public.verified_organizer_applications for update using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));
create policy "game_reg_read"          on public.organizer_game_registrations for select using (auth.uid() = organizer_id or exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));
create policy "game_reg_insert"        on public.organizer_game_registrations for insert with check (auth.uid() = organizer_id);
create policy "game_reg_admin_update"  on public.organizer_game_registrations for update using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

-- COMMUNITY & GROUP JOIN REQUESTS
create policy "cjr_own_insert"    on public.community_join_requests for insert with check (auth.uid() = user_id);
create policy "cjr_own_read"      on public.community_join_requests for select using (
  auth.uid() = user_id
  or exists (select 1 from public.communities c where c.id = community_id and c.owner_id = auth.uid())
  or exists (select 1 from public.community_members cm where cm.community_id = community_join_requests.community_id and cm.user_id = auth.uid() and cm.role in ('owner','moderator'))
);
create policy "cjr_owner_update"  on public.community_join_requests for update using (
  exists (select 1 from public.communities c where c.id = community_id and c.owner_id = auth.uid())
  or exists (select 1 from public.community_members cm where cm.community_id = community_join_requests.community_id and cm.user_id = auth.uid() and cm.role in ('owner','moderator'))
);
create policy "gjr_own_insert"    on public.group_join_requests for insert with check (auth.uid() = user_id);
create policy "gjr_own_read"      on public.group_join_requests for select using (
  auth.uid() = user_id
  or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  or exists (select 1 from public.group_members gm where gm.group_id = group_join_requests.group_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
);
create policy "gjr_owner_update"  on public.group_join_requests for update using (
  exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  or exists (select 1 from public.group_members gm where gm.group_id = group_join_requests.group_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
);

-- AUDIT LOG
create policy "audit_log_own_read"   on public.audit_log for select using (auth.uid() = user_id or exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));
create policy "audit_log_insert_all" on public.audit_log for insert with check (true);

-- ============================================================
-- PART 9: MAKE YOURSELF ADMIN (run separately after signup)
-- ============================================================
-- update public.users set is_admin = true where email = 'adeniyigideon23@gmail.com';

-- ============================================================
-- VERIFY — should show all tables with column counts
-- ============================================================
select table_name,
  (select count(*) from information_schema.columns c
   where c.table_name = t.table_name and c.table_schema = 'public') as col_count
from information_schema.tables t
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;
