-- Detailed artist pricing (rate card + collab types) and campaign offering.
-- Run in the Supabase SQL editor (safe to run once).

-- 1) Artist: a structured rate card, the collaboration formats they accept,
--    and a minimum budget.
alter table artists add column if not exists rate_card jsonb default '[]'::jsonb;
alter table artists add column if not exists collab_types text[] default '{}';
alter table artists add column if not exists min_budget integer;   -- paise

-- 2) Campaign: what the brand is actually offering.
alter table campaigns add column if not exists compensation_type text;  -- paid | gifted | paid_product | commission
alter table campaigns add column if not exists offer_description text;   -- "₹15,000 + PR kit worth ₹8,000"
alter table campaigns add column if not exists product_value integer;    -- paise (gifted value)

-- 3) Surface the rate card on the public stats view (appended columns only).
create or replace view artist_public_stats as
select a.id as artist_id, a.display_name, a.bio, a.location, a.accepting_deals,
       a.pricing, a.price_min, a.price_max, a.currency,
       ia.username, ia.followers_count, ia.media_count, ia.profile_picture_url,
       ia.biography,
       a.created_at,
       ia.engagement_rate,
       a.specialties,
       a.rate_card,
       a.collab_types,
       a.min_budget
from artists a
join instagram_accounts ia on ia.artist_id = a.id
where a.accepting_deals = true;
grant select on artist_public_stats to authenticated;
