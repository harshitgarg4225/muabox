-- Admin + moderation. Run in the Supabase SQL editor (safe to run once).

alter table profiles add column if not exists is_admin boolean default false;
alter table profiles add column if not exists suspended boolean default false;

-- Security: users must NOT be able to update their own profile row (the
-- "own profile" RLS policy would otherwise let them set is_admin/suspended).
-- The app never updates profiles from the user client (it only inserts at
-- onboarding and updates artists/brands), so revoke UPDATE entirely.
-- Admin/moderation writes go through the service role, which bypasses this.
revoke update on profiles from authenticated;
revoke update on profiles from anon;

-- Bootstrap your first admin (replace the email):
--   update profiles set is_admin = true where email = 'you@example.com';
-- or set ADMIN_EMAILS in the environment.
