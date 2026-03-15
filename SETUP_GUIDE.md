# Tourena Fresh Start Setup Guide

## Overview
This guide will help you reset the database, fix all connection issues, and ensure smooth operation.

## Step 1: Create Storage Buckets

Go to Supabase Dashboard → Storage → Create the following buckets (all PUBLIC):

1. **avatars** - User profile pictures
2. **thumbnails** - Tournament thumbnails
3. **banners** - Tournament banners  
4. **media** - General media uploads (teams, communities, etc.)

For each bucket:
- Click "New Bucket"
- Name: (see above)
- Public: ✅ YES
- Click "Create bucket"

## Step 2: Set Storage Policies

For each bucket, add these policies (Storage → [bucket name] → Policies):

### Policy 1: Public Read Access
```sql
create policy "Public read access"
on storage.objects for select
using (bucket_id = 'avatars'); -- change bucket name for each
```

### Policy 2: Authenticated Upload
```sql
create policy "Authenticated users can upload"
on storage.objects for insert
with check (
  bucket_id = 'avatars' -- change bucket name for each
  and auth.role() = 'authenticated'
);
```

### Policy 3: Users can update their own files
```sql
create policy "Users can update own files"
on storage.objects for update
using (
  bucket_id = 'avatars' -- change bucket name for each
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 4: Users can delete their own files
```sql
create policy "Users can delete own files"
on storage.objects for delete
using (
  bucket_id = 'avatars' -- change bucket name for each
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

Repeat for all 4 buckets: `avatars`, `thumbnails`, `banners`, `media`.

## Step 3: Run Database Migration

Go to Supabase Dashboard → SQL Editor → New Query

Paste the contents of `supabase/MIGRATION_FRESH_START.sql` and click "Run".

This will:
- Delete all existing user data
- Reset platform settings
- Fix account approval logic (players auto-approved, organizers need approval)

## Step 4: Verify Setup

Run this query in SQL Editor:

```sql
select 'Users' as table_name, count(*) as count from public.users
union all
select 'Platform settings', count(*) from public.platform_settings
union all
select 'Tournaments', count(*) from public.tournaments
union all
select 'Storage buckets', count(*) from storage.buckets;
```

Expected results:
- Users: 0
- Platform settings: 16
- Tournaments: 0
- Storage buckets: 4

## Step 5: Test the App

1. Clear browser storage:
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data
   - Close DevTools

2. Refresh the app (`http://localhost:5174/`)

3. Sign up as a **player**:
   - Should be auto-approved
   - Should redirect to `/discover` immediately

4. Sign up as an **organizer** (use different email):
   - Should show "Account Pending" page
   - Admin must approve in `/admin/users`

5. Test file uploads:
   - Player: Upload avatar in Settings
   - Organizer (after approval): Create tournament with thumbnail

## Key Changes Made

### 1. Account Approval
- **Players**: Auto-approved on signup
- **Organizers**: Require admin approval

### 2. Role Switching
- **Organizers → Player**: Allowed (button in Settings)
- **Player → Organizer**: NOT allowed (contact admin)

### 3. File Uploads
- All upload paths now include file extensions
- Proper content-type headers
- Storage buckets must exist before uploads work

### 4. Auth Flow
- Fixed race condition in `AuthContext`
- `try/finally` ensures loading state always resolves
- Profile fetch retries reduced (3 attempts, 500ms each)
- Early exit on "no rows" error

### 5. Database
- Fresh start migration clears all user data
- Platform settings preserved
- Trigger updated for auto-approval logic

## Troubleshooting

### "RLS policy violation" on tournament create
- Check user's `account_status` is `'approved'`
- Check storage buckets exist
- Check storage policies are set

### "400 Bad Request" on file upload
- Storage bucket doesn't exist
- Storage policies not set
- File has no extension (should be fixed now)

### App hangs on loading spinner
- Clear browser storage
- Check console for errors
- Verify Supabase connection in `.env`

### "Account Pending" for player
- Run migration again (Step 3)
- Or manually update: `update users set account_status = 'approved' where role = 'player';`

## Environment Variables

Verify `.env` file has:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FLUTTERWAVE_PUBLIC_KEY=your-flw-key
```

## Next Steps

After setup:
1. Create first admin account (manually in Supabase):
   ```sql
   update users set is_admin = true, account_status = 'approved' 
   where email = 'your-admin-email@example.com';
   ```

2. Test all features:
   - Player signup/login
   - Organizer signup/approval
   - Tournament creation
   - File uploads
   - Wallet operations

3. Monitor logs for any errors

## Support

If issues persist:
1. Check browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify all storage buckets and policies exist
4. Re-run migration if needed
