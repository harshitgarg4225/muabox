-- 0011 — indexes for the hottest list/sort paths.
--
-- The deals inbox filters by participant and sorts by recent activity. With
-- only single-column (artist_id / brand_id) indexes, Postgres had to sort the
-- matched rows in memory on every page. These composite indexes let the same
-- query be served straight from the index, including pagination cursors.
create index if not exists deals_brand_recent_idx
  on deals (brand_id, last_message_at desc);
create index if not exists deals_artist_recent_idx
  on deals (artist_id, last_message_at desc);

-- The deal-detail page looks up reviews by deal_id for every accepted/completed
-- deal. There was no index on that column (only reviewee_id).
create index if not exists reviews_deal_idx on reviews (deal_id);
