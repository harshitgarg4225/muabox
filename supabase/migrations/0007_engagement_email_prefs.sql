-- Scalable discover (stored engagement) + email notification preference.
-- Run in the Supabase SQL editor (safe to run once).

-- 1) Persist engagement so Discover can sort/filter/paginate in the DB instead
--    of computing over a bounded window in memory. Refreshed on sync/connect.
alter table instagram_accounts add column if not exists engagement_rate numeric;

-- Expose it on the public stats view.
create or replace view artist_public_stats as
select a.id as artist_id, a.display_name, a.bio, a.location, a.accepting_deals,
       a.pricing, a.price_min, a.price_max, a.currency,
       ia.username, ia.followers_count, ia.media_count, ia.profile_picture_url,
       ia.biography,
       a.created_at,
       ia.engagement_rate
from artists a
join instagram_accounts ia on ia.artist_id = a.id
where a.accepting_deals = true;
grant select on artist_public_stats to authenticated;

-- 2) Per-user email notification preference (transactional emails respect it).
alter table profiles add column if not exists email_notifications boolean default true;
-- UPDATE on profiles is revoked from the client (see 0006); allow only this one
-- column so users can manage their own preference without touching is_admin etc.
grant update (email_notifications) on profiles to authenticated;
