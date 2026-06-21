-- Muabox database schema (Phase 2).
-- Run in the Supabase SQL editor. RLS is enforced from the start.

-- ROLES & PROFILES (1:1 with auth.users)
create type user_role as enum ('artist', 'brand');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text,
  email text,
  is_admin boolean default false,
  suspended boolean default false,
  email_notifications boolean default true,
  whatsapp text,
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
  price_min integer,           -- in minor currency units (e.g. paise); null if custom
  price_max integer,
  currency text default 'INR',
  specialties text[] default '{}',   -- luxury niches: Bridal, Editorial, Celebrity…
  rate_card jsonb default '[]'::jsonb,   -- [{deliverable, price(paise)|null}]
  collab_types text[] default '{}',      -- Paid, Gifted/barter, Paid + product…
  min_budget integer,                    -- paise
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
  engagement_rate numeric,                 -- derived; refreshed on connect/sync
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
  open_to_pitches boolean default true,
  created_at timestamptz default now()
);

-- CAMPAIGNS (brand budget container for outreach at scale)
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  description text,
  product text,
  budget integer,                          -- paise; null = no fixed budget
  status text not null default 'active',   -- active | closed
  target_specialties text[] default '{}',
  compensation_type text,                  -- paid | gifted | paid_product | commission
  offer_description text,
  product_value integer,                   -- paise (gifted value)
  required_hashtags text[] default '{}',   -- creative brief: must-use tags
  required_mentions text[] default '{}',   -- must-tag @handles
  dos text,
  donts text,
  disclosure_required boolean not null default true,  -- ASCI #ad disclosure
  created_at timestamptz default now()
);

-- DEALS (brand -> artist offers, or artist -> brand pitches)
create type deal_status as enum ('sent', 'viewed', 'accepted', 'declined', 'completed');

create table deals (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  status deal_status default 'sent',
  message text,
  offer_amount integer,        -- minor units (paise); null if "let's discuss"
  currency text default 'INR',
  product_description text,
  brand_read_at timestamptz,
  artist_read_at timestamptz,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  paid_at timestamptz,
  campaign_id uuid references campaigns(id) on delete set null,
  initiated_by user_role not null default 'brand',
  reminded_at timestamptz,
  disclosure_confirmed_at timestamptz,     -- artist confirmed ASCI #ad disclosure
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DEAL MESSAGES (threaded conversation per deal)
create table deal_messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

-- PAYMENTS (Razorpay; India)
create table payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  amount integer not null,           -- minor units (paise)
  currency text not null default 'INR',
  status text not null default 'created',  -- created | paid | failed
  transfer_id text,                  -- Razorpay Route transfer to the artist
  transfer_status text not null default 'none',  -- none | pending | done | failed
  transferred_amount integer,        -- minor units actually sent to the artist
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ARTIST PAYOUT ACCOUNTS (Razorpay Route linked accounts)
create table artist_payout_accounts (
  artist_id uuid primary key references artists(id) on delete cascade,
  razorpay_account_id text,
  razorpay_product_id text,
  status text not null default 'pending',   -- pending | active | failed
  bank_last4 text,
  beneficiary_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- REVIEWS (left after an accepted/completed collaboration; both directions)
create table reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  reviewer_role user_role not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (deal_id, reviewer_id)
);

-- INDEXES
create index instagram_media_account_idx on instagram_media (instagram_account_id);
create index reviews_reviewee_idx on reviews (reviewee_id);
create index reviews_deal_idx on reviews (deal_id);
create index deals_artist_idx on deals (artist_id);
create index deals_brand_idx on deals (brand_id);
create index deals_campaign_idx on deals (campaign_id);
-- Inbox sorts by recent activity per participant; serve sort straight from index.
create index deals_brand_recent_idx on deals (brand_id, last_message_at desc);
create index deals_artist_recent_idx on deals (artist_id, last_message_at desc);
create index campaigns_brand_idx on campaigns (brand_id);
create index deal_messages_deal_idx on deal_messages (deal_id, created_at);
create index payments_deal_idx on payments (deal_id);
create unique index payments_order_uidx on payments (razorpay_order_id);

-- RLS
alter table profiles enable row level security;
alter table artists enable row level security;
alter table instagram_accounts enable row level security;
alter table instagram_media enable row level security;
alter table brands enable row level security;
alter table campaigns enable row level security;
alter table deals enable row level security;
alter table deal_messages enable row level security;
alter table payments enable row level security;
alter table artist_payout_accounts enable row level security;
alter table reviews enable row level security;

-- profiles: a user sees/edits only their own profile row
create policy "own profile" on profiles for all using (auth.uid() = id);
-- but users must not be able to UPDATE profiles (would allow self-escalation of
-- is_admin/suspended); admin/moderation writes use the service role.
revoke update on profiles from authenticated;
revoke update on profiles from anon;
-- ...except their own email notification preference (single safe column).
grant update (email_notifications) on profiles to authenticated;
grant update (whatsapp) on profiles to authenticated;

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
create policy "brand creates deal" on deals for insert with check (
  auth.uid() = brand_id and initiated_by = 'brand'
);
create policy "artist creates pitch" on deals for insert with check (
  auth.uid() = artist_id and initiated_by = 'artist'
);

-- campaigns: owner full access; an artist on a campaign deal can read it
create policy "own campaigns" on campaigns
  for all using (auth.uid() = brand_id) with check (auth.uid() = brand_id);
create policy "deal artist reads campaign" on campaigns for select using (
  exists (
    select 1 from deals d
    where d.campaign_id = campaigns.id and d.artist_id = auth.uid()
  )
);
grant select, insert, update on campaigns to authenticated;
create policy "participants update" on deals for update using (auth.uid() = brand_id or auth.uid() = artist_id);

-- deal_messages: participants of the parent deal can read; post as self
create policy "participant reads messages" on deal_messages for select using (
  exists (
    select 1 from deals d
    where d.id = deal_messages.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
create policy "participant sends messages" on deal_messages for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from deals d
    where d.id = deal_messages.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
grant select, insert on deal_messages to authenticated;

-- payments: participants read; the paying brand creates; captures are server-side
create policy "participant reads payments" on payments for select using (
  exists (
    select 1 from deals d
    where d.id = payments.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
create policy "brand creates payment" on payments for insert with check (
  brand_id = auth.uid()
);
grant select, insert on payments to authenticated;

-- artist_payout_accounts: each artist owns their own record
create policy "own payout account" on artist_payout_accounts
  for all using (auth.uid() = artist_id) with check (auth.uid() = artist_id);
grant select, insert, update on artist_payout_accounts to authenticated;

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
       a.created_at,
       ia.engagement_rate,
       a.specialties,
       a.rate_card,
       a.collab_types,
       a.min_budget
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
select id as brand_id, company_name, website, logo_url, description, open_to_pitches
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

-- reviews: public read (trust signal); write only your counterparty on a real deal
create policy "reviews readable" on reviews for select using (true);
create policy "participant writes review" on reviews for insert with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from deals d
    where d.id = reviews.deal_id
      and d.status in ('accepted', 'completed')
      and (
        (d.brand_id = auth.uid() and d.artist_id = reviews.reviewee_id)
        or (d.artist_id = auth.uid() and d.brand_id = reviews.reviewee_id)
      )
  )
);
grant select, insert on reviews to authenticated;

create view artist_ratings as
select r.reviewee_id as artist_id,
       round(avg(r.rating)::numeric, 1) as avg_rating,
       count(*)::int as review_count
from reviews r
join profiles p on p.id = r.reviewee_id and p.role = 'artist'
group by r.reviewee_id;
grant select on artist_ratings to authenticated;

create view brand_ratings as
select r.reviewee_id as brand_id,
       round(avg(r.rating)::numeric, 1) as avg_rating,
       count(*)::int as review_count
from reviews r
join profiles p on p.id = r.reviewee_id and p.role = 'brand'
group by r.reviewee_id;
grant select on brand_ratings to authenticated;

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

-- keep deals.last_message_* fresh on every new message (powers unread badges)
create or replace function bump_deal_on_message()
returns trigger language plpgsql security definer as $$
begin
  update deals
    set last_message_at = new.created_at,
        last_message_sender_id = new.sender_id,
        updated_at = now()
    where id = new.deal_id;
  return new;
end; $$;

create trigger deal_messages_bump
  after insert on deal_messages
  for each row execute function bump_deal_on_message();

-- live updates for the deal thread
do $$
begin
  alter publication supabase_realtime add table deal_messages;
exception when others then null;
end $$;

-- ============================================================================
-- EXECUTION LAYER (0012): deliverables, shipments, promo codes
-- ============================================================================

-- DELIVERABLES & CONTENT PROOF — one row per expected piece of content.
create table deal_deliverables (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  label text not null,
  post_url text,
  status text not null default 'pending',  -- pending | submitted | approved | changes_requested
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);
create index deal_deliverables_deal_idx on deal_deliverables (deal_id);
alter table deal_deliverables enable row level security;
create policy "deliverable participants read" on deal_deliverables for select using (
  exists (select 1 from deals d where d.id = deal_deliverables.deal_id
    and (d.brand_id = auth.uid() or d.artist_id = auth.uid()))
);
create policy "brand creates deliverable" on deal_deliverables for insert with check (
  exists (select 1 from deals d where d.id = deal_deliverables.deal_id and d.brand_id = auth.uid())
);
create policy "deliverable participants update" on deal_deliverables for update using (
  exists (select 1 from deals d where d.id = deal_deliverables.deal_id
    and (d.brand_id = auth.uid() or d.artist_id = auth.uid()))
);
create policy "brand deletes deliverable" on deal_deliverables for delete using (
  exists (select 1 from deals d where d.id = deal_deliverables.deal_id and d.brand_id = auth.uid())
);
grant select, insert, update, delete on deal_deliverables to authenticated;

-- PRODUCT SEEDING LOGISTICS — consented shipping, 1:1 with a deal.
create table deal_shipments (
  deal_id uuid primary key references deals(id) on delete cascade,
  recipient_name text,
  address_line text,
  city text,
  state text,
  pincode text,
  phone text,
  courier text,
  tracking_number text,
  status text not null default 'pending',  -- pending | address_provided | shipped | delivered
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table deal_shipments enable row level security;
create policy "shipment participants read" on deal_shipments for select using (
  exists (select 1 from deals d where d.id = deal_shipments.deal_id
    and (d.brand_id = auth.uid() or d.artist_id = auth.uid()))
);
create policy "shipment participants write" on deal_shipments for insert with check (
  exists (select 1 from deals d where d.id = deal_shipments.deal_id
    and (d.brand_id = auth.uid() or d.artist_id = auth.uid()))
);
create policy "shipment participants update" on deal_shipments for update using (
  exists (select 1 from deals d where d.id = deal_shipments.deal_id
    and (d.brand_id = auth.uid() or d.artist_id = auth.uid()))
);
grant select, insert, update on deal_shipments to authenticated;

-- PER-CREATOR PROMO CODES — sales attribution.
create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  code text not null,
  description text,
  redemptions integer not null default 0,
  revenue integer not null default 0,       -- attributed sales, paise
  created_at timestamptz default now(),
  unique (campaign_id, code)
);
create index promo_codes_campaign_idx on promo_codes (campaign_id);
create index promo_codes_artist_idx on promo_codes (artist_id);
alter table promo_codes enable row level security;
create policy "brand manages promo codes" on promo_codes for all
  using (auth.uid() = brand_id) with check (auth.uid() = brand_id);
create policy "artist reads own promo code" on promo_codes for select
  using (auth.uid() = artist_id);
grant select, insert, update, delete on promo_codes to authenticated;
