---
name: muabox-mua-brand-marketplace
description: End-to-end build playbook for "Muabox" — a two-sided marketplace where makeup artists (MUAs) sign up via Instagram (consented OAuth, no Facebook Page required) and configure whether they accept brand deals + pricing, and skincare brands browse artists and send PR collab offers. Use this skill whenever building, scaffolding, or extending this marketplace: setting up the Next.js + Supabase + Vercel stack, implementing the Instagram API with Instagram Login OAuth flow, writing the database schema, building the Meta App Review compliance routes (deauthorize + data deletion), or sequencing the build. Follow it literally and in order; the architecture decisions are already locked, do not re-litigate them.
---

# Muabox — MUA × Skincare Brand PR Marketplace (Build Bible)

This document is the single source of truth for building the product. It is written so a coder (human or AI) can follow it top-to-bottom without re-deciding anything. **Decisions are final. Build in the order given.**

---

## 0. What we are building (product spec)

A two-sided marketplace:

- **Makeup artists (MUAs / the "supply" side):** sign up, connect Instagram in one tap, their profile auto-fills with follower count + recent media + engagement. They set a single toggle — *accepting deals: yes/no* — and pricing (fixed tiers or "custom / contact me").
- **Skincare brands (the "demand" side):** browse a feed/grid of artists who are accepting deals, view each artist's stats, and send a PR collab offer (a "deal").
- **Deals:** a brand sends an offer (message + optional amount + product description). The artist sees it, accepts/declines. That's the MVP loop. Payments/escrow are explicitly OUT of MVP scope.

**MVP success = a brand can find a consented artist and send a deal; the artist receives and responds to it; the Instagram data shown is real and pulled via the official API.**

---

## 1. Locked architecture decisions (do not change)

| Concern | Decision | Why |
|---|---|---|
| Frontend + backend | **Single Next.js app (App Router, TypeScript)** | One codebase. Instagram OAuth callback is one route handler. No separate Python backend. |
| Database + auth + storage | **Supabase** (Postgres + Supabase Auth + Storage) | Managed auth, Postgres with Row Level Security, file storage — minimal backend code. |
| UI | **Tailwind CSS + shadcn/ui + lucide-react** | Fast to generate, matches ecosystem defaults. |
| Hosting | **Vercel** | Free HTTPS domain (required for Meta review), native Next.js, Cron jobs for sync. |
| Instagram data | **Official "Instagram API with Instagram Login"** (free) | $0/mo, fully compliant, durable. No Facebook Page required for the artist. |
| Scopes (round 1) | **`instagram_business_basic` only** | Fewest scopes = fastest App Review. Engagement/insights scope is a *second* review round. |
| Payments | **Deferred (post-approval)** — Stripe Connect later | Heaviest feature; not needed to run or to pass review. |
| Cold-prospect discovery | **Deferred** — MVP brands browse only the onboarded, consented roster | Browsing non-consented accounts looks like scraping to Meta reviewers; rejection risk. |

---

## 2. Open source projects & libraries to use

Install these; do not hand-roll equivalents.

**Scaffold / framework**
- `create-next-app` — project scaffold. (`npx create-next-app@latest`)
- Reference only (read for patterns, don't fork wholesale): `nextjs/saas-starter` (github.com/nextjs/saas-starter) for Stripe wiring later, and `mickasmt/next-saas-stripe-starter` for role/admin patterns.

**Supabase**
- `@supabase/supabase-js` — client.
- `@supabase/ssr` — server-side auth/session handling in App Router (cookies).

**UI**
- `tailwindcss` + `postcss` + `autoprefixer`
- `shadcn/ui` — component library (`npx shadcn@latest init`). Components to add: `button card input label switch select textarea avatar badge dialog form sonner skeleton`.
- `lucide-react` — icons.
- `react-tinder-card` — OPTIONAL, only if you want a swipe UI for brand discovery. A responsive grid is fine and simpler for MVP; prefer the grid first.

**Forms / validation**
- `react-hook-form` + `zod` + `@hookform/resolvers` — all forms (pricing config, deal composer, profile).

**Instagram OAuth**
- No dedicated library needed — it's a small custom flow (Section 7). Reference implementation for the shape of the flow: the public gist `PrenSJ2/0213e60e834e66b7e09f7f93999163fc` (Instagram Login OAuth + callback + DB tables). Read it for structure; rewrite in TS for our routes.

**Crypto (already in Node)**
- `node:crypto` — for parsing Meta's signed_request on the deauthorize / data-deletion callbacks. No install needed.

**Dev**
- `typescript`, `@types/node`, `eslint`.

---

## 3. Accounts & prerequisites (provision before coding)

1. **GitHub** account + a new empty repo.
2. **Vercel** account (link to the GitHub repo). Gives a `*.vercel.app` HTTPS URL immediately; add a custom domain when ready.
3. **Supabase** account + a new project. Save: Project URL, `anon` public key, `service_role` secret key, DB password.
4. **Meta / Facebook Developer** account.
5. **A business entity** for Meta Business Verification (the long pole — START THIS FIRST, see Section 4). Verification needs official business documents and runs in the background for days while you build.

---

## 4. Phase 0 — kick off Meta Business Verification (DO THIS ON DAY ONE)

This is pure waiting time; start it before writing code so it overlaps with the build.

1. Go to developers.facebook.com → **Create App** → app type **Business**.
2. In the App Dashboard, add the **Instagram** product → choose **API setup with Instagram login** (this is "Business Login for Instagram" — the path that does NOT require a linked Facebook Page).
3. Note your **Instagram App ID** and **Instagram App Secret** (App Dashboard → Instagram → API setup with Instagram login).
4. Go to **Business verification** in the dashboard and start verifying the business portfolio (upload business documents). This takes days; let it run.
5. Leave the app in **Development mode** for now — in dev mode you can test against accounts you add as testers/roles without full review.

> App Review (Section 11) comes later, once the connect flow works. Expect 2–6 weeks for review; reviewers can request changes which resets the clock. Start the review submission *before* the rest of the product is feature-complete.

---

## 5. Phase 1 — scaffold the app

```bash
# 1. Scaffold
npx create-next-app@latest muabox --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd muabox

# 2. Supabase + UI deps
npm install @supabase/supabase-js @supabase/ssr
npm install react-hook-form zod @hookform/resolvers lucide-react

# 3. shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input label switch select textarea avatar badge dialog form sonner skeleton

# 4. First commit + push to GitHub, then import the repo in Vercel.
git add -A && git commit -m "scaffold" && git push
```

In Vercel, import the repo and deploy. Confirm the live `*.vercel.app` URL works. Set this as `NEXT_PUBLIC_APP_URL`.

### Environment variables (`.env.local`, and mirror in Vercel project settings)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...            # server-only, never exposed to client
NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...                 # server-only
INSTAGRAM_REDIRECT_URI=https://yourapp.vercel.app/api/instagram/callback
TOKEN_ENCRYPTION_KEY=...                 # 32-byte key for encrypting stored IG tokens
```

> In the Meta dashboard → Instagram → API setup with Instagram login → **Business login settings**, add the OAuth Redirect URI (`INSTAGRAM_REDIRECT_URI`), the **Deauthorize callback URL** (`/api/instagram/deauthorize`), and the **Data deletion request URL** (`/api/instagram/data-deletion`). These three are required before review.

---

## 6. Phase 2 — database schema (Supabase SQL)

Run this in the Supabase SQL editor. RLS is enforced from the start.

```sql
-- ROLES & PROFILES (1:1 with auth.users)
create type user_role as enum ('artist', 'brand');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text,
  email text,
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
  price_min integer,           -- in minor currency units (e.g. cents); null if custom
  price_max integer,
  currency text default 'USD',
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
  created_at timestamptz default now()
);

-- DEALS (brand -> artist offers)
create type deal_status as enum ('sent', 'viewed', 'accepted', 'declined', 'completed');

create table deals (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  status deal_status default 'sent',
  message text,
  offer_amount integer,        -- minor units; null if "let's discuss"
  currency text default 'USD',
  product_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table artists enable row level security;
alter table instagram_accounts enable row level security;
alter table instagram_media enable row level security;
alter table brands enable row level security;
alter table deals enable row level security;

-- profiles: a user sees/edits only their own profile row
create policy "own profile" on profiles for all using (auth.uid() = id);

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
create policy "brand creates deal" on deals for insert with check (auth.uid() = brand_id);
create policy "participants update" on deals for update using (auth.uid() = brand_id or auth.uid() = artist_id);

-- PUBLIC STATS VIEW (exposes follower/engagement WITHOUT the token column)
create view artist_public_stats as
select a.id as artist_id, a.display_name, a.bio, a.location, a.accepting_deals,
       a.pricing, a.price_min, a.price_max, a.currency,
       ia.username, ia.followers_count, ia.media_count, ia.profile_picture_url
from artists a
join instagram_accounts ia on ia.artist_id = a.id
where a.accepting_deals = true;
```

> Security rule: `access_token_encrypted` lives only in `instagram_accounts`, which is owner-only RLS. Brands read artist data through `artist_public_stats` / the media policy, which never touch the token. Never `select access_token` in any client-reachable query.

---

## 7. Phase 3 — Instagram API with Instagram Login (the core)

This is the only non-trivial integration. The flow:

```
artist clicks "Connect Instagram"
  -> /api/instagram/connect  (redirect to Instagram authorize URL)
  -> Instagram consent screen
  -> redirect back to /api/instagram/callback?code=...
  -> exchange code -> short-lived token
  -> exchange short-lived -> long-lived token (60 days)
  -> fetch profile + media
  -> encrypt token, upsert instagram_accounts + instagram_media
  -> redirect artist to their profile page
```

**Account requirement:** the artist must have an Instagram **Professional account (Business or Creator)**. Personal accounts are not supported by any Meta API. Add a "convert to a Professional account" helper link in onboarding.

**Base hosts:** authorize on `instagram.com`, token exchange on `api.instagram.com`, data on `graph.instagram.com`. Use the current Graph version (v22+ as of 2026 — confirm the latest version string in the dashboard and pin it in a constant).

### 7a. `/app/api/instagram/connect/route.ts`

```ts
import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
    response_type: "code",
    scope: "instagram_business_basic", // round 1 only
  });
  // Optionally append &state=<csrf-token> and verify it in the callback.
  return NextResponse.redirect(
    `https://www.instagram.com/oauth/authorize?${params.toString()}`
  );
}
```

### 7b. `/app/api/instagram/callback/route.ts`

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // server client w/ user session
import { encryptToken } from "@/lib/crypto";

const GRAPH = "https://graph.instagram.com";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=denied`);

  // 1) code -> short-lived token
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
      code,
    }),
  });
  const short = await shortRes.json(); // { access_token, user_id, permissions }

  // 2) short-lived -> long-lived (60 days)
  const longRes = await fetch(
    `${GRAPH}/access_token?grant_type=ig_exchange_token` +
    `&client_secret=${process.env.INSTAGRAM_APP_SECRET}` +
    `&access_token=${short.access_token}`
  );
  const long = await longRes.json(); // { access_token, token_type, expires_in }
  const expiresAt = new Date(Date.now() + long.expires_in * 1000).toISOString();

  // 3) fetch profile
  const fields = "user_id,username,account_type,followers_count,follows_count,media_count,profile_picture_url,biography,website";
  const profRes = await fetch(`${GRAPH}/me?fields=${fields}&access_token=${long.access_token}`);
  const prof = await profRes.json();

  // 4) fetch recent media
  const mediaFields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const mediaRes = await fetch(`${GRAPH}/me/media?fields=${mediaFields}&limit=12&access_token=${long.access_token}`);
  const media = await mediaRes.json(); // { data: [...] }

  // 5) persist (server-side, service role or RLS-authed)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ig } = await supabase.from("instagram_accounts").upsert({
    artist_id: user!.id,
    ig_user_id: String(prof.user_id),
    username: prof.username,
    account_type: prof.account_type,
    followers_count: prof.followers_count,
    follows_count: prof.follows_count,
    media_count: prof.media_count,
    profile_picture_url: prof.profile_picture_url,
    biography: prof.biography,
    website: prof.website,
    access_token_encrypted: encryptToken(long.access_token),
    token_expires_at: expiresAt,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "artist_id" }).select().single();

  if (ig && media.data?.length) {
    await supabase.from("instagram_media").insert(
      media.data.map((m: any) => ({
        instagram_account_id: ig.id,
        ig_media_id: m.id,
        caption: m.caption,
        media_type: m.media_type,
        media_url: m.media_url,
        thumbnail_url: m.thumbnail_url,
        permalink: m.permalink,
        like_count: m.like_count,
        comments_count: m.comments_count,
        posted_at: m.timestamp,
      }))
    );
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=1`);
}
```

> Field availability note: `followers_count`, `media_count`, `username`, `account_type` are reliably available with `instagram_business_basic`. `biography`/`website`/`profile_picture_url` availability shifts between Graph versions — if a field returns empty, drop it from the `fields` list rather than letting the whole call 400. Verify field names against the live "Instagram API with Instagram Login" reference before submitting for review.

### 7c. Token encryption helper `/lib/crypto.ts`

```ts
import crypto from "node:crypto";
const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encryptToken(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}
export function decryptToken(stored: string) {
  const [iv, tag, enc] = stored.split(":").map((h) => Buffer.from(h, "hex"));
  const d = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
```

### 7d. Engagement rate (derived, no extra scope needed)

```
engagement_rate = (avg(like_count + comments_count) over recent media) / followers_count * 100
```
Compute on read or store on sync. This is enough for MVP; true reach/impressions/demographics need the insights scope (review round 2).

---

## 8. Phase 4 — token refresh & data sync

Long-lived tokens last 60 days; refresh before expiry. Follower counts/media should refresh on a schedule (rate limit: ~200 calls/user/hour — so a nightly batch is plenty; never poll in a loop).

**Vercel Cron** (`vercel.json`):
```json
{ "crons": [{ "path": "/api/cron/sync-instagram", "schedule": "0 3 * * *" }] }
```

`/app/api/cron/sync-instagram/route.ts` (protect with a secret header):
- For each `instagram_accounts` row: decrypt token; if `token_expires_at` < 7 days away, call
  `GET graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<token>` and store the new token + expiry.
- Re-fetch `/me` (followers_count, media_count) and latest `/me/media`; update rows; set `last_synced_at`.
- Handle revoked tokens (HTTP 400 with an OAuth error) by marking the account disconnected and `accepting_deals=false`.

Also add a manual "Refresh stats" button on the artist dashboard that hits the same logic for one account (debounced).

---

## 9. Phase 5 — Meta compliance routes (REQUIRED before review)

Meta sends a **signed_request** (`<base64url-sig>.<base64url-payload>`, HMAC-SHA256 keyed by the app secret) to both callbacks. Parse and verify it.

`/lib/meta-signed-request.ts`:
```ts
import crypto from "node:crypto";
export function parseSignedRequest(signed: string) {
  const [encSig, payload] = signed.split(".");
  const expected = crypto.createHmac("sha256", process.env.INSTAGRAM_APP_SECRET!)
    .update(payload).digest();
  const sig = Buffer.from(encSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (!crypto.timingSafeEqual(sig, expected)) throw new Error("bad sig");
  return JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
}
```

**`/app/api/instagram/deauthorize/route.ts`** — fired when a user removes your app from Instagram. Parse the signed_request, get `user_id`, delete/disconnect that `instagram_accounts` row, set the artist's `accepting_deals=false`. Return `200`.

**`/app/api/instagram/data-deletion/route.ts`** — Meta requires this. Parse the signed_request, delete the user's IG data, then return JSON:
```json
{ "url": "https://yourapp.vercel.app/data-deletion-status?id=<code>", "confirmation_code": "<code>" }
```
Build a `/data-deletion-status` page that looks up `<code>` and shows deletion status.

**`/app/privacy/page.tsx`** — a real privacy policy page. Must state: what Instagram data you collect (username, follower count, media), why, how a user requests deletion, and that data is consent-based. This URL goes in App Settings. (Generate a first draft with a privacy-policy generator, then edit to match the data above.)

---

## 10. Phase 6 — app features

### Auth & onboarding
- Supabase Auth (email magic link or Google). On first login, ask **"I'm an artist" / "I'm a brand"** → create the `profiles` row with the role, then the `artists` or `brands` row.
- App login is SEPARATE from the Instagram connection. (You log into Muabox with email; you separately connect Instagram.)

### Artist side
1. Onboarding: "Connect Instagram" (Section 7) → profile auto-fills.
2. Profile editor: display_name, bio, location.
3. **Deals config:** `accepting_deals` switch; pricing — radio `fixed | custom`; if fixed, show price_min/price_max + currency.
4. Dashboard: their stats (followers, engagement, media gallery), "Refresh stats" button, and an inbox of received deals with Accept/Decline buttons.

### Brand side
1. Onboarding: company_name, website, logo upload (Supabase Storage), description.
2. **Discover:** grid (or `react-tinder-card` swipe) reading from `artist_public_stats`. Filters: follower range, location, pricing model. Each card → artist detail (stats + recent media via the media RLS policy).
3. **Send deal:** a dialog with message, optional offer_amount, product_description → inserts into `deals` (status `sent`). RLS guarantees the brand can only insert deals as themselves.

### Deals
- Artist inbox lists `deals` where `artist_id = me`. Opening one sets status `viewed`. Accept/Decline updates status. Brand dashboard shows status of sent deals.
- (Later) add a `deal_messages` table for threaded back-and-forth.

---

## 11. Phase 7 — Meta App Review submission

Submit once the connect flow works on the live Vercel URL.

**Checklist (all must be true):**
- [ ] App on a public HTTPS domain (Vercel URL is fine).
- [ ] Business verification complete (from Phase 0).
- [ ] OAuth redirect URI, Deauthorize callback, Data deletion URL all set in Business login settings.
- [ ] Privacy policy URL set in App Settings; app icon + category set.
- [ ] Requesting **only `instagram_business_basic`** in this submission.
- [ ] A **screencast** (not screenshots — static images are rejected) showing the full journey: log in → click Connect Instagram → Instagram consent → land back on the dashboard with real follower count + media displayed. Narrate or caption what `instagram_business_basic` is used for ("display the artist's own profile and media so brands can evaluate them for PR collaborations").
- [ ] Provide test credentials (a demo artist login) so the reviewer can reproduce.

**Then:** submit → wait (plan 2–6 weeks, revisions reset the clock) → on approval, switch the app **Development → Live**.

**What gets you rejected (avoid):** anything that looks like scraping, competitive intelligence, or reselling data; requesting scopes you don't visibly use; showing data for accounts that didn't consent. Keep the demo strictly to the consented-artist flow.

---

## 12. Deferred (only after approval / when justified)

1. **Insights scope (review round 2):** add `instagram_business_manage_insights` (or the current insights scope name) for true reach/impressions/audience demographics. Separate screencast, separate submission.
2. **Payments:** Stripe Connect for brand→artist payouts. Pull patterns from `nextjs/saas-starter`. Never put card/bank details in the app; use Stripe-hosted flows.
3. **Cold-prospect discovery:** if brands demand searching artists who haven't signed up, evaluate a licensed public-data database (e.g. Modash) — but frame it carefully and keep it separate from the consented data path.
4. **Threaded deal messaging**, notifications (email via Resend), saved/favorited artists, search ranking.

---

## 13. Common errors / gotchas

- **"Application does not have permission" / empty fields** → a scope isn't granted, or the field isn't available in your Graph version. Reduce the `fields` list; confirm the account is Professional.
- **Personal account connects but returns nothing** → only Business/Creator accounts work. Gate onboarding on account type.
- **Token expired (400 after ~60 days)** → refresh logic in the cron didn't run or token was revoked; mark disconnected, prompt reconnect.
- **429 / rate limited** → you're polling. Move to the nightly cron + debounced manual refresh. Limit is per-user per-hour.
- **Reviewer can't reproduce** → you forgot test credentials, or the app is still in Development mode, or the flow is behind auth they can't pass. Provide a demo artist account.
- **Stale scope names** → old tutorials use `business_basic`; the current names are `instagram_business_*`. Use the new ones.
- **Pinned Graph version drifts** → keep the version string in one constant; bump deliberately, not silently.

---

## 14. Linear build order (the "no-brain" checklist)

1. [ ] Phase 0: create Meta app (Business + Instagram login product), start business verification.
2. [ ] Phase 1: scaffold Next.js + Supabase + shadcn, deploy to Vercel, set env vars.
3. [ ] Phase 2: run the schema SQL in Supabase (tables + RLS + view).
4. [ ] Supabase Auth + role selection + profile/artist/brand row creation.
5. [ ] Phase 3: `/api/instagram/connect` + `/api/instagram/callback` + crypto helper. Connect a real test account; confirm rows populate.
6. [ ] Phase 5: privacy page + deauthorize + data-deletion routes (do these now so review isn't blocked).
7. [ ] Phase 6 artist side: profile editor, deals config (accepting toggle + pricing), dashboard with real stats.
8. [ ] Phase 6 brand side: discover grid from `artist_public_stats`, artist detail, send-deal dialog.
9. [ ] Phase 6 deals: artist inbox + accept/decline + brand status view.
10. [ ] Phase 4: token refresh + nightly sync cron + manual refresh button.
11. [ ] Phase 7: record screencast, submit App Review for `instagram_business_basic`.
12. [ ] On approval: flip to Live mode. Ship. Then revisit Section 12 deferrals.
