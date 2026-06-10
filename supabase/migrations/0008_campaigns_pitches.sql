-- Campaigns, pitches, reminders, luxury specialties.
-- Run in the Supabase SQL editor (safe to run once).

-- 1) Luxury specialties on artists (niche targeting).
alter table artists add column if not exists specialties text[] default '{}';

-- 2) Brands can opt in/out of receiving artist pitches.
alter table brands add column if not exists open_to_pitches boolean default true;

-- 3) Campaigns: the brand's budget container for outreach at scale.
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  description text,
  product text,
  budget integer,                          -- paise; null = no fixed budget
  status text not null default 'active',   -- active | closed
  target_specialties text[] default '{}',
  created_at timestamptz default now()
);
create index if not exists campaigns_brand_idx on campaigns (brand_id);

-- 4) Deals: campaign link, who initiated (pitch support), reminder tracking.
alter table deals add column if not exists campaign_id uuid references campaigns(id) on delete set null;
alter table deals add column if not exists initiated_by user_role not null default 'brand';
alter table deals add column if not exists reminded_at timestamptz;
create index if not exists deals_campaign_idx on deals (campaign_id);

-- 5) Campaign RLS.
alter table campaigns enable row level security;
create policy "own campaigns" on campaigns
  for all using (auth.uid() = brand_id) with check (auth.uid() = brand_id);
-- An artist on a campaign deal may read that campaign's name/brief.
create policy "deal artist reads campaign" on campaigns for select using (
  exists (
    select 1 from deals d
    where d.campaign_id = campaigns.id and d.artist_id = auth.uid()
  )
);
grant select, insert, update on campaigns to authenticated;

-- 6) Tighten brand deal-creation to brand-initiated rows, and let artists pitch.
drop policy if exists "brand creates deal" on deals;
create policy "brand creates deal" on deals for insert with check (
  auth.uid() = brand_id and initiated_by = 'brand'
);
create policy "artist creates pitch" on deals for insert with check (
  auth.uid() = artist_id and initiated_by = 'artist'
);

-- 7) Brand directory for artists (adds open_to_pitches).
create or replace view brand_public as
select id as brand_id, company_name, website, logo_url, description, open_to_pitches
from brands;
grant select on brand_public to authenticated;

-- 8) Specialties on the public stats view (appended at the end).
create or replace view artist_public_stats as
select a.id as artist_id, a.display_name, a.bio, a.location, a.accepting_deals,
       a.pricing, a.price_min, a.price_max, a.currency,
       ia.username, ia.followers_count, ia.media_count, ia.profile_picture_url,
       ia.biography,
       a.created_at,
       ia.engagement_rate,
       a.specialties
from artists a
join instagram_accounts ia on ia.artist_id = a.id
where a.accepting_deals = true;
grant select on artist_public_stats to authenticated;
