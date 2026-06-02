-- Discovery upgrades: shortlist (saved artists) + created_at on the public view.
-- Run this in the Supabase SQL editor if you already ran schema.sql.

-- 1) Expose artist created_at so brands can sort by "newest".
create or replace view artist_public_stats as
select a.id as artist_id, a.display_name, a.bio, a.location, a.accepting_deals,
       a.pricing, a.price_min, a.price_max, a.currency,
       ia.username, ia.followers_count, ia.media_count, ia.profile_picture_url,
       ia.biography,
       a.created_at
from artists a
join instagram_accounts ia on ia.artist_id = a.id
where a.accepting_deals = true;

grant select on artist_public_stats to authenticated;

-- 2) Brand shortlists ("save"/favorite an artist).
create table if not exists saved_artists (
  brand_id uuid not null references brands(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (brand_id, artist_id)
);

alter table saved_artists enable row level security;

-- A brand can only see and manage its own saves.
create policy "own saves" on saved_artists
  for all using (auth.uid() = brand_id) with check (auth.uid() = brand_id);

grant select, insert, delete on saved_artists to authenticated;
