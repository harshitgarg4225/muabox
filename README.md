# Muabox

A two-sided marketplace where **makeup artists (MUAs)** connect Instagram and set
their deal preferences, and **skincare brands** browse consented artists and send
PR collaboration offers ("deals").

Built per the build bible in
[`.claude/skills/muabox-mua-brand-marketplace/SKILL.md`](.claude/skills/muabox-mua-brand-marketplace/SKILL.md).

## Stack

- **Next.js 16** (App Router, TypeScript) — single codebase, web + API routes
- **Supabase** — Postgres + Auth + Storage, with Row Level Security
- **Tailwind CSS v4 + shadcn/ui + lucide-react** — UI
- **react-hook-form + zod** — forms & validation
- **Instagram API with Instagram Login** — official, free, no Facebook Page required
- **Vercel** — hosting + Cron for nightly sync

## What's implemented

| Area | Status |
|---|---|
| Auth (email/password + magic link) + role onboarding | ✅ |
| Artist: Instagram OAuth connect, auto-filled stats, media gallery, engagement rate | ✅ |
| Artist: profile editor, pricing (fixed/custom), accepting-deals toggle, manual refresh | ✅ |
| Brand: profile + logo upload, Discover (search, sort, tiers, engagement, shortlists), artist detail | ✅ |
| Deals: send, full lifecycle (accept/decline/complete), threaded messaging + live updates | ✅ |
| Unread badges + read tracking across the deal inbox | ✅ |
| Email notifications (new deal, accept/decline, new message, completed, paid) via Resend | ✅ optional |
| Payments: brand pays an accepted deal via Razorpay (Orders + Checkout + signature/webhook), INR | ✅ optional |
| Artist payouts: Razorpay Route linked accounts + KYC/bank onboarding + auto transfer on capture (configurable platform fee) | ✅ optional |
| Admin dashboard: overview/observability, user moderation (suspend, grant admin), deals & payments browsers | ✅ |
| Cursor pagination on the deals inbox + all admin lists; DB-side Discover ranking | ✅ |
| Auth: password reset, in-app account deletion, email notification preferences | ✅ |
| Quality: Vitest unit suite, GitHub Actions CI, CSP + security headers, rate limiting, structured logging, 0 npm vulns | ✅ |
| Meta compliance: deauthorize + data-deletion callbacks, status page, privacy policy | ✅ |
| Token refresh + nightly sync (Vercel Cron) | ✅ |
| Database schema + RLS + public views | ✅ `supabase/schema.sql` + `migrations/` |
| Payments (Stripe Connect), insights scope, cold-prospect discovery | ⏳ Deferred (see SKILL §12) |

## Project layout

```
src/
  app/
    page.tsx                       landing
    login/                         auth (password + magic link)
    onboarding/                    role selection -> profile/artist/brand rows
    privacy/                       privacy policy (required for Meta review)
    data-deletion-status/          deletion confirmation page
    auth/callback, auth/signout    session exchange + sign out
    (app)/                         authenticated, role-aware UI (nav layout)
      dashboard/                   artist stats / brand summary
      settings/                    artist or brand profile editor
      discover/                    brand-only artist grid + filters
      artists/[id]/                brand-only artist detail + send-deal dialog
      deals/                       artist inbox / brand sent list
    api/instagram/
      connect, callback            OAuth flow
      deauthorize, data-deletion   Meta signed_request callbacks
      refresh                      manual single-account sync
    api/cron/sync-instagram        nightly batch (secret-protected)
  lib/
    supabase/{server,client,admin,middleware}.ts
    instagram.ts, instagram-sync.ts, crypto.ts, meta-signed-request.ts
    auth.ts, types.ts, utils.ts
  components/                      UI + feature components
  proxy.ts                        session refresh + route guard (Next 16 proxy)
supabase/schema.sql               tables, RLS policies, public views
vercel.json                       cron schedule
```

## Local setup

> The app needs external accounts that only you can provision. These steps can't
> be automated.

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. (If you set
   up before later upgrades, also run the files in
   [`supabase/migrations/`](supabase/migrations) in order — `0002` adds brand
   shortlists + the discover sort, `0003` adds deal messaging, read tracking and
   live updates, `0004` adds Razorpay payments + INR defaults, `0005` adds
   artist payouts (Razorpay Route), `0006` adds admin + moderation flags,
   `0007` adds stored engagement + email preferences.)
3. Storage → create a **public** bucket named `logos` (for brand logos).
4. Auth → for easy local testing, disable "Confirm email" (Auth → Providers →
   Email) so password sign-up logs you straight in.

### 3. Meta / Instagram (see SKILL §0 and §4)

1. [developers.facebook.com](https://developers.facebook.com) → Create App →
   **Business** → add **Instagram** product → **API setup with Instagram login**.
2. Note the Instagram **App ID** and **App Secret**.
3. Under *Business login settings* add:
   - OAuth redirect URI → `${APP_URL}/api/instagram/callback`
   - Deauthorize callback → `${APP_URL}/api/instagram/deauthorize`
   - Data deletion request URL → `${APP_URL}/api/instagram/data-deletion`
4. Start **Business Verification** early — it takes days.

### 4. Environment

Copy `.env.example` → `.env.local` and fill it in:

```bash
cp .env.example .env.local
# generate a token encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4b. Payments (Razorpay, India) — optional

1. Create a [Razorpay](https://razorpay.com) account; grab the **Key ID** and
   **Key Secret** (test mode is fine to start).
2. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and
   `NEXT_PUBLIC_RAZORPAY_KEY_ID` (= the Key ID) in your env.
3. In the Razorpay dashboard add a **webhook** → URL `${APP_URL}/api/payments/webhook`,
   event `payment.captured`, and set its secret as `RAZORPAY_WEBHOOK_SECRET`.

Currency is **INR**; amounts are stored in paise. Without these vars the Pay
button simply reports "payments unavailable" — nothing breaks.

**Artist payouts (Razorpay Route)** — the money loop is closed:

- Artists add KYC + bank details under **Profile → Payouts**, which creates a
  Razorpay **linked account** + Route product and configures settlements. Only
  the bank's last 4 digits are stored locally; the rest goes to Razorpay.
- On payment capture (verify + webhook) we **auto-transfer** the artist's share
  to their linked account, withholding `PLATFORM_FEE_PERCENT` (default 10%).
- Payments captured before an artist finishes payout setup are held
  (`transfer_status = pending`) and **reconciled automatically** the moment they
  activate payouts.
- Enable Route on your Razorpay account; no extra keys needed (it uses the same
  `RAZORPAY_KEY_ID`/`SECRET`).

### 4c. Admin access — optional

Admins can reach `/admin` (overview, user moderation, deals & payments). Grant
access either way:

- set `ADMIN_EMAILS=you@example.com` (comma-separated) in the env, or
- `update profiles set is_admin = true where email = 'you@example.com';`

Suspending a user blocks their app access and hides artists from Discover.
Users can never edit their own `is_admin`/`suspended` (UPDATE on `profiles` is
revoked from the client; only the service role writes those).

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

> Instagram OAuth requires an Instagram **Professional** (Business/Creator)
> account and the redirect URI registered in the Meta dashboard. The rest of the
> app (auth, roles, deals, brand discovery) works without Instagram connected.

## Deploy (Vercel)

1. Import the repo in Vercel.
2. Add every variable from `.env.example` in Project Settings (set
   `NEXT_PUBLIC_APP_URL` and `INSTAGRAM_REDIRECT_URI` to the deployed URL).
3. `vercel.json` registers the nightly cron at 03:00. Vercel sends
   `Authorization: Bearer $CRON_SECRET` automatically — set `CRON_SECRET`.
4. Update the three Meta callback URLs to the production domain.

## Security notes

- Instagram access tokens are AES-256-GCM encrypted (`lib/crypto.ts`) and live
  only in the owner-only `instagram_accounts` table — never sent to the client.
- Brands read artist data exclusively through the `artist_public_stats` /
  `artist_public_media` views, which never expose the token column and are
  filtered to consented (accepting) artists.
- Meta callbacks verify the HMAC-SHA256 `signed_request` before acting.
- The service-role key is used only in trusted server contexts (Meta callbacks,
  cron) and never imported into client code.

## Next steps before Meta App Review (SKILL §11)

- Deploy to a public HTTPS URL and finish Business Verification.
- Record a screencast of the full connect flow.
- Submit requesting **only** `instagram_business_basic`.
- Provide a demo artist login for the reviewer.
