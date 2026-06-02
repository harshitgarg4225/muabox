-- Artist payouts via Razorpay Route (linked accounts + transfers).
-- Run in the Supabase SQL editor (safe to run once).

-- 1) One Razorpay linked (Route) account per artist.
create table if not exists artist_payout_accounts (
  artist_id uuid primary key references artists(id) on delete cascade,
  razorpay_account_id text,
  razorpay_product_id text,
  status text not null default 'pending',   -- pending | active | failed
  bank_last4 text,
  beneficiary_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table artist_payout_accounts enable row level security;
-- The artist owns (and can read/manage) their own payout record. Full bank
-- numbers are never stored here — only the last 4 — the rest goes to Razorpay.
create policy "own payout account" on artist_payout_accounts
  for all using (auth.uid() = artist_id) with check (auth.uid() = artist_id);
grant select, insert, update on artist_payout_accounts to authenticated;

-- 2) Track the Route transfer for each captured payment.
alter table payments add column if not exists transfer_id text;
alter table payments add column if not exists transfer_status text not null default 'none';
  -- none | pending | done | failed
alter table payments add column if not exists transferred_amount integer;
