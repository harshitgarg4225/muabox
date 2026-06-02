-- Muabox database schema (Phase 2).
-- Run in the Supabase SQL editor. RLS is enforced from the start.

-- ROLES & PROFILES (1:1 with auth.users)
create type user_role as enum ('artist', 'brand');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text,
  email text,
  created_at timestamptz default now()
);

-- ARTISTS
create type pricing_model as enum ('fixed', 'custom');

create table artists (
  id uuid primary key references profiles(id) on delete cascade,
  display_name text,
  bio text,
  location text,
  accepting_deals boolean default false,
  pricing pricing_model default 'custom',
  price_min integer,           -- in minor currency units (e.g. cents); null if custom
  price_max integer,
  currency text default 'USD',
  created_at timestamptz default now()
);

-- INSTAGRAM ACCOUNTS (consented, 1:1 with artist for MVP)
create table instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id) on delete cascade,
  ig_user_id text not null,
  username text,
  account_type text,
  followers_count integer,
  follows_count integer,
  media_count integer,
  profile_picture_url text,
  biography text,
  website text,
  access_token_encrypted text not null,   -- encrypted; NEVER sent to client
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  unique (artist_id)
);

-- RECENT MEDIA (for the profile gallery + engagement calc)
create table instagram_media (
  id uuid primary key default gen_random_uuid(),
  instagram_account_id uuid not null references instagram_accounts(id) on delete cascade,
  ig_media_id text not null,
  caption text,
  media_type text,
  media_url text,
  thumbnail_url text,
  permalink text,
  like_count integer,
  comments_count integer,
  posted_at timestamptz
);

-- BRANDS
create table brands (
  id uuid primary key references profiles(id) on delete cascade,
  company_name text,
  website text,
  logo_url text,
  description text,
  created_at timestamptz default now()
);

-- DEALS (brand -> artist offers)
create type deal_status as enum ('sent', 'viewed', 'accepted', 'declined', 'completed');

create table deals (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  status deal_status default 'sent',
  message text,
  offer_amount integer,        -- minor units; null if "let's discuss"
  currency text default 'USD',
  product_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INDEXES
create index instagram_media_account_idx on instagram_media (instagram_account_id);
create index deals_artist_idx on deals (artist_id);
create index deals_brand_idx on deals (brand_id);

-- RLS
alter table profiles enable row level security;
alter table artists enable row level security;
alter table instagram_accounts enable row level security;
alter table instagram_media enable row level security;
alter table brands enable row level security;
alter table deals enable row level security;

-- profiles: a user sees/edits only their own profile row
create policy "own profile" on profiles for all using (auth.uid() = id);

-- artists: owner full access; anyone authenticated can READ artists who are accepting deals
create policy "artist owner" on artists for all using (auth.uid() = id);
create policy "browse accepting artists" on artists for select using (accepting_deals = true);

-- instagram_accounts: owner only (tokens live here). Public stats are exposed via a VIEW, see below.
create policy "ig owner" on instagram_accounts for all using (auth.uid() = artist_id);

-- instagram_media: readable if the parent artist is accepting deals OR you own it
create policy "media owner" on instagram_media for all using (
  exists (select 1 from instagram_accounts ia where ia.id = instagram_media.instagram_account_id and ia.artist_id = auth.uid())
);
create policy "media public for accepting" on instagram_media for select using (
  exists (
    select 1 from instagram_accounts ia
    join artists a on a.id = ia.artist_id
    where ia.id = instagram_media.instagram_account_id and a.accepting_deals = true
  )
);

-- brands: owner only
create policy "brand owner" on brands for all using (auth.uid() = id);

-- deals: visible to the brand or the artist on the deal
create policy "deal participants read" on deals for select using (auth.uid() = brand_id or auth.uid() = artist_id);
create policy "brand creates deal" on deals for insert with check (auth.uid() = brand_id);
create policy "participants update" on deals for update using (auth.uid() = brand_id or auth.uid() = artist_id);

-- PUBLIC STATS VIEW (exposes follower/engagement WITHOUT the token column).
-- A default (security definer) view so brands can read consented-artist stats
-- without gaining access to the owner-only instagram_accounts table. The view
-- only ever selects non-sensitive columns — never the token — and is filtered
-- to artists who are accepting deals.
create view artist_public_stats as
select a.id as artist_id, a.display_name, a.bio, a.location, a.accepting_deals,
       a.pricing, a.price_min, a.price_max, a.currency,
       ia.username, ia.followers_count, ia.media_count, ia.profile_picture_url,
       ia.biography,
       a.created_at
from artists a
join instagram_accounts ia on ia.artist_id = a.id
where a.accepting_deals = true;

-- PUBLIC MEDIA VIEW (recent media for accepting artists, keyed by artist_id).
-- Same rationale: lets brands render an artist's gallery without reading
-- instagram_accounts. No token column is exposed.
create view artist_public_media as
select ia.artist_id,
       m.id, m.ig_media_id, m.caption, m.media_type, m.media_url,
       m.thumbnail_url, m.permalink, m.like_count, m.comments_count, m.posted_at
from instagram_media m
join instagram_accounts ia on ia.id = m.instagram_account_id
join artists a on a.id = ia.artist_id
where a.accepting_deals = true;

-- PUBLIC BRAND VIEW (so artists can see who sent them a deal).
-- Brands are companies; only their public-facing fields are exposed here.
create view brand_public as
select id as brand_id, company_name, website, logo_url, description
from brands;

-- Expose the public views to logged-in users only (subject to PostgREST).
grant select on artist_public_stats to authenticated;
grant select on artist_public_media to authenticated;
grant select on brand_public to authenticated;

-- BRAND SHORTLISTS (saved/favorited artists)
create table saved_artists (
  brand_id uuid not null references brands(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (brand_id, artist_id)
);

alter table saved_artists enable row level security;
create policy "own saves" on saved_artists
  for all using (auth.uid() = brand_id) with check (auth.uid() = brand_id);
grant select, insert, delete on saved_artists to authenticated;

-- keep deals.updated_at fresh
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger deals_set_updated_at
  before update on deals
  for each row execute function set_updated_at();
