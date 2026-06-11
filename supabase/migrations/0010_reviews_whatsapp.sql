-- Reviews & ratings, WhatsApp opt-in. Run in the Supabase SQL editor (safe to re-run).

-- 1) Reviews — left after an accepted/completed collaboration, both directions.
create table if not exists reviews (
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
create index if not exists reviews_reviewee_idx on reviews (reviewee_id);

alter table reviews enable row level security;

-- Ratings are a public trust signal — any signed-in user can read them.
drop policy if exists "reviews readable" on reviews;
create policy "reviews readable" on reviews for select using (true);

-- You may review only your own counterparty on an accepted/completed deal.
drop policy if exists "participant writes review" on reviews;
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

-- 2) Aggregate rating views (default views = readable regardless of RLS).
create or replace view artist_ratings as
select r.reviewee_id as artist_id,
       round(avg(r.rating)::numeric, 1) as avg_rating,
       count(*)::int as review_count
from reviews r
join profiles p on p.id = r.reviewee_id and p.role = 'artist'
group by r.reviewee_id;
grant select on artist_ratings to authenticated;

create or replace view brand_ratings as
select r.reviewee_id as brand_id,
       round(avg(r.rating)::numeric, 1) as avg_rating,
       count(*)::int as review_count
from reviews r
join profiles p on p.id = r.reviewee_id and p.role = 'brand'
group by r.reviewee_id;
grant select on brand_ratings to authenticated;

-- 3) Optional WhatsApp number for notifications (user-editable column only).
alter table profiles add column if not exists whatsapp text;
grant update (whatsapp) on profiles to authenticated;
