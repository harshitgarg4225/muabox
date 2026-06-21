-- 0012 — campaign-execution & measurement layer.
-- Turns the marketplace into an influencer-marketing platform: deliverables &
-- content proof, structured creative briefs + disclosure, product-seeding
-- logistics, and per-creator promo codes for sales attribution.
-- Idempotent — safe to re-run.

-- ============================================================================
-- 1) CREATIVE BRIEF + DISCLOSURE (on campaigns + per-deal confirmation)
-- ============================================================================
alter table campaigns add column if not exists required_hashtags text[] default '{}';
alter table campaigns add column if not exists required_mentions text[] default '{}';
alter table campaigns add column if not exists dos text;
alter table campaigns add column if not exists donts text;
-- India's ASCI requires clear #ad/#sponsored disclosure on paid promotions.
alter table campaigns add column if not exists disclosure_required boolean not null default true;

-- The artist confirms they'll disclose (ASCI) when they accept a deal.
alter table deals add column if not exists disclosure_confirmed_at timestamptz;

-- ============================================================================
-- 2) DELIVERABLES & CONTENT PROOF
-- ============================================================================
-- One row per piece of content the brand expects. The artist fills in the live
-- post URL and submits; the brand approves or requests changes.
create table if not exists deal_deliverables (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  label text not null,                       -- "Instagram Reel", "2 Stories"…
  post_url text,
  status text not null default 'pending',    -- pending | submitted | approved | changes_requested
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists deal_deliverables_deal_idx on deal_deliverables (deal_id);

alter table deal_deliverables enable row level security;

-- Both participants of the parent deal can see the deliverables.
drop policy if exists "deliverable participants read" on deal_deliverables;
create policy "deliverable participants read" on deal_deliverables for select using (
  exists (
    select 1 from deals d
    where d.id = deal_deliverables.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
-- The brand owns the brief, so the brand seeds the deliverable line-items.
drop policy if exists "brand creates deliverable" on deal_deliverables;
create policy "brand creates deliverable" on deal_deliverables for insert with check (
  exists (
    select 1 from deals d
    where d.id = deal_deliverables.deal_id and d.brand_id = auth.uid()
  )
);
-- Either participant can update a row (artist submits a URL, brand reviews).
-- Field-level rules (who may submit vs. approve) are enforced in server actions.
drop policy if exists "deliverable participants update" on deal_deliverables;
create policy "deliverable participants update" on deal_deliverables for update using (
  exists (
    select 1 from deals d
    where d.id = deal_deliverables.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
drop policy if exists "brand deletes deliverable" on deal_deliverables;
create policy "brand deletes deliverable" on deal_deliverables for delete using (
  exists (
    select 1 from deals d
    where d.id = deal_deliverables.deal_id and d.brand_id = auth.uid()
  )
);
grant select, insert, update, delete on deal_deliverables to authenticated;

-- ============================================================================
-- 3) PRODUCT SEEDING LOGISTICS (consented shipping for gifting deals)
-- ============================================================================
-- 1:1 with a deal. The artist provides a consented shipping address; the brand
-- fills the courier + tracking and marks it shipped/delivered.
create table if not exists deal_shipments (
  deal_id uuid primary key references deals(id) on delete cascade,
  recipient_name text,
  address_line text,
  city text,
  state text,
  pincode text,
  phone text,
  courier text,
  tracking_number text,
  status text not null default 'pending',    -- pending | address_provided | shipped | delivered
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table deal_shipments enable row level security;

drop policy if exists "shipment participants read" on deal_shipments;
create policy "shipment participants read" on deal_shipments for select using (
  exists (
    select 1 from deals d
    where d.id = deal_shipments.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
drop policy if exists "shipment participants write" on deal_shipments;
create policy "shipment participants write" on deal_shipments for insert with check (
  exists (
    select 1 from deals d
    where d.id = deal_shipments.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
drop policy if exists "shipment participants update" on deal_shipments;
create policy "shipment participants update" on deal_shipments for update using (
  exists (
    select 1 from deals d
    where d.id = deal_shipments.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
grant select, insert, update on deal_shipments to authenticated;

-- ============================================================================
-- 4) PER-CREATOR PROMO CODES (sales attribution)
-- ============================================================================
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  code text not null,
  description text,                          -- "15% off", "Buy 1 Get 1"…
  redemptions integer not null default 0,
  revenue integer not null default 0,        -- attributed sales, paise
  created_at timestamptz default now(),
  unique (campaign_id, code)
);
create index if not exists promo_codes_campaign_idx on promo_codes (campaign_id);
create index if not exists promo_codes_artist_idx on promo_codes (artist_id);

alter table promo_codes enable row level security;

-- The brand that owns the campaign manages its codes.
drop policy if exists "brand manages promo codes" on promo_codes;
create policy "brand manages promo codes" on promo_codes for all
  using (auth.uid() = brand_id) with check (auth.uid() = brand_id);
-- The assigned artist can see their own code.
drop policy if exists "artist reads own promo code" on promo_codes;
create policy "artist reads own promo code" on promo_codes for select
  using (auth.uid() = artist_id);
grant select, insert, update, delete on promo_codes to authenticated;
