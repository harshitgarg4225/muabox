-- 0013 — pre-release QA hardening.
-- Idempotent; safe to re-run.

-- Reviews only after a deal is COMPLETED (not merely accepted). Prevents
-- premature/retaliatory ratings right after an offer is accepted.
drop policy if exists "participant writes review" on reviews;
create policy "participant writes review" on reviews for insert with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from deals d
    where d.id = reviews.deal_id
      and d.status = 'completed'
      and (
        (d.brand_id = auth.uid() and d.artist_id = reviews.reviewee_id)
        or (d.artist_id = auth.uid() and d.brand_id = reviews.reviewee_id)
      )
  )
);
