-- 0014 — QA round 2: payout fee snapshot + data-deletion request log.
-- Idempotent; safe to re-run.

-- Snapshot the platform fee on each payment at order time, so a payout
-- transferred later (after the artist onboards) uses the fee that applied when
-- the brand paid — not whatever PLATFORM_FEE_PERCENT happens to be set to later.
alter table payments add column if not exists fee_percent numeric;

-- Persist Meta data-deletion requests so /data-deletion-status can report a
-- real status for the confirmation code Meta surfaces to the user.
create table if not exists data_deletion_requests (
  code text primary key,
  ig_user_id text,
  status text not null default 'completed',  -- received | completed
  created_at timestamptz default now()
);
-- No public/authenticated access; only the service role (status page + callback)
-- touches this table.
alter table data_deletion_requests enable row level security;
