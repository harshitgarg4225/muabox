-- Deal workspace: threaded messaging, read tracking, unread badges.
-- Run in the Supabase SQL editor (safe to run once).

-- 1) Per-deal conversation.
create table if not exists deal_messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists deal_messages_deal_idx on deal_messages (deal_id, created_at);

alter table deal_messages enable row level security;

-- Either participant of the parent deal can read the thread.
create policy "participant reads messages" on deal_messages for select using (
  exists (
    select 1 from deals d
    where d.id = deal_messages.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
-- A participant can post as themselves.
create policy "participant sends messages" on deal_messages for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from deals d
    where d.id = deal_messages.deal_id
      and (d.brand_id = auth.uid() or d.artist_id = auth.uid())
  )
);
grant select, insert on deal_messages to authenticated;

-- 2) Read tracking + denormalized last-message info for fast unread badges.
alter table deals add column if not exists brand_read_at timestamptz;
alter table deals add column if not exists artist_read_at timestamptz;
alter table deals add column if not exists last_message_at timestamptz;
alter table deals add column if not exists last_message_sender_id uuid;

-- The original offer counts as the first message (from the brand).
update deals
  set last_message_at = coalesce(last_message_at, created_at),
      last_message_sender_id = coalesce(last_message_sender_id, brand_id)
  where last_message_at is null;

-- 3) Keep deals.last_message_* fresh on every new message.
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

drop trigger if exists deal_messages_bump on deal_messages;
create trigger deal_messages_bump
  after insert on deal_messages
  for each row execute function bump_deal_on_message();

-- 4) Live updates (ignore if the publication already includes it).
do $$
begin
  alter publication supabase_realtime add table deal_messages;
exception when others then null;
end $$;
