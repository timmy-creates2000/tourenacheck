-- ============================================================
-- TOURENA FRESH START MIGRATION
-- Run this in Supabase SQL Editor to reset and fix everything
-- ============================================================

-- ============================================================
-- STEP 1: DELETE ALL USER DATA (FRESH START)
-- ============================================================

-- Delete all data from all tables (cascades will handle most)
truncate table public.users cascade;
truncate table public.platform_settings restart identity;
truncate table public.sponsors restart identity;
truncate table public.events restart identity;
truncate table public.news restart identity;

-- Re-insert platform settings
insert into public.platform_settings (key, value, description) values
  ('player_withdrawal_commission_pct', '5', 'Player withdrawal commission %'),
  ('organizer_withdrawal_commission_pct', '5', 'Organizer withdrawal commission %'),
  ('practice_platform_fee_tc', '5', 'Platform fee for practice tournaments (TC)'),
  ('referral_bonus_pct', '3', 'Referral bonus % of referred user earnings'),
  ('referral_duration_days', '30', 'How long referral tracking lasts (days)'),
  ('min_deposit_tc', '10', 'Minimum coin purchase amount (TC)'),
  ('min_withdrawal_tc', '15', 'Minimum withdrawal amount (TC)'),
  ('fraud_threshold_tc', '10000', 'Withdrawals above this need manual review'),
  ('coin_gift_max_tc', '5000', 'Max coins a user can gift per day'),
  ('flw_fee_ngn_pct', '0.014', 'Flutterwave NGN transfer fee %'),
  ('flw_fee_ngn_cap', '2000', 'Flutterwave NGN fee cap (fiat)'),
  ('flw_fee_international_pct', '0.038', 'Flutterwave international transfer fee %'),
  ('ngn_rate', '10', '1 TC = X NGN'),
  ('usd_rate', '0.006', '1 TC = X USD'),
  ('kes_rate', '0.8', '1 TC = X KES'),
  ('ghs_rate', '0.09', '1 TC = X GHS')
on conflict (key) do update set value = excluded.value;

-- ============================================================
-- STEP 2: FIX ACCOUNT APPROVAL LOGIC
-- Players auto-approved, organizers need approval
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
declare
  v_role text;
  v_status text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'player');
  -- Players are auto-approved, organizers need approval
  v_status := case when v_role = 'player' then 'approved' else 'pending' end;

  insert into public.users (id, email, username, role, referral_code, account_status, coin_balance, preferred_currency)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    v_role,
    upper(substring(md5(random()::text) from 1 for 8)),
    v_status, 0, 'NGN'
  )
  on conflict (id) do nothing;

  insert into public.player_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$func$;

-- ============================================================
-- STEP 3: CREATE STORAGE BUCKETS (if not exist)
-- Run these in Supabase Dashboard → Storage → New Bucket
-- OR use the Supabase CLI/API
-- ============================================================

-- Buckets needed:
-- 1. avatars (public)
-- 2. thumbnails (public)
-- 3. banners (public)
-- 4. media (public)

-- Note: Storage bucket creation must be done via Dashboard or API
-- SQL cannot create storage buckets directly

-- ============================================================
-- STEP 4: STORAGE POLICIES (after buckets are created)
-- ============================================================

-- These policies allow authenticated users to upload to their own folders
-- and everyone to read public files

-- Example policy structure (adjust bucket names as needed):
-- create policy "Public read access" on storage.objects for select using (bucket_id = 'avatars');
-- create policy "Authenticated upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- STEP 5: FIX ROLE SWITCHING LOGIC
-- Organizers can switch to player, players cannot switch to organizer
-- ============================================================

-- This is enforced in the frontend (ProfileSettings.jsx)
-- No database-level constraint needed, just UI logic

-- ============================================================
-- DONE!
-- ============================================================

-- Verify setup:
select 'Users table' as check_name, count(*) as count from public.users
union all
select 'Platform settings', count(*) from public.platform_settings
union all
select 'Tournaments', count(*) from public.tournaments;
