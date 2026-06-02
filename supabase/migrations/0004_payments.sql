-- Payments (Razorpay) + INR defaults for the India market.
-- Run in the Supabase SQL editor (safe to run once).

-- 1) Default currency to INR for new artists/deals.
alter table artists alter column currency set default 'INR';
alter table deals alter column currency set default 'INR';

-- 2) Mark when a deal has been paid (fast display + guards double-pay).
alter table deals add column if not exists paid_at timestamptz;

-- 3) Payment records (one per Razorpay order/attempt).
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  amount integer not null,           -- minor units (paise)
  currency text not null default 'INR',
  status text not null default 'created',  -- created | paid | failed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists payments_deal_idx on payments (deal_id);
create unique index if not exists payments_order_uidx on payments (razorpay_order_id);

alter table payments enable row level security;

-- Either participant of the deal can see its payments.
create policy "participant reads payments" on payments for select using (
  exists (
    select 1 from deals d
    where d.id = payments.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
-- The paying brand can create a payment intent as themselves.
create policy "brand creates payment" on payments for insert with check (
  brand_id = auth.uid()
);
-- Captures/updates happen server-side via the service role (bypasses RLS).
grant select, insert on payments to authenticated;
