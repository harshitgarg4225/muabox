import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { applyReadMarker } from "@/lib/deal-reads";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { DealActions } from "@/components/deal-actions";
import { DealThread } from "@/components/deal-thread";
import { PayDealButton } from "@/components/pay-deal-button";
import { RemindButton } from "@/components/remind-button";
import { ConfirmButton } from "@/components/confirm-button";
import { withdrawDeal } from "@/app/(app)/deals/actions";
import { ReviewForm } from "@/components/review-form";
import { StarRating } from "@/components/star-rating";
import { LocalDate } from "@/components/local-date";
import { DeliverablesSection } from "@/components/deliverables-section";
import { BriefCard, type Brief } from "@/components/brief-card";
import { ShipmentSection } from "@/components/shipment-section";
import { PromoCodeCallout } from "@/components/promo-code-callout";
import { compensationLabel } from "@/lib/pricing";
import { PLATFORM_FEE_PERCENT, artistShare } from "@/lib/payouts";
import {
  formatMoney,
  type Deal,
  type DealMessage,
  type ArtistPublicStats,
  type BrandPublic,
  type Review,
  type Rating,
  type DealDeliverable,
  type DealShipment,
  type PromoCode,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");

  const { id } = await params;
  const supabase = await createClient();

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .maybeSingle<Deal>();

  if (!deal) notFound();

  // Mark read (and bump sent->viewed for the receiver) using the deal we just
  // loaded — no second auth call or fetch, and it only writes when needed.
  await applyReadMarker(supabase, deal, user.id);

  const { data: messageRows } = await supabase
    .from("deal_messages")
    .select("*")
    .eq("deal_id", id)
    .order("created_at", { ascending: true });

  // The original offer/pitch note reads as the initiator's opening message.
  const isPitch = deal.initiated_by === "artist";
  const opening: DealMessage[] = deal.message
    ? [
        {
          id: `offer-${deal.id}`,
          deal_id: deal.id,
          sender_id: isPitch ? deal.artist_id : deal.brand_id,
          body: deal.message,
          created_at: deal.created_at,
        },
      ]
    : [];
  const messages = [...opening, ...((messageRows as DealMessage[]) ?? [])];

  // For a paid deal, does the artist have payouts set up?
  let artistPayoutActive = false;
  if (profile.role === "artist" && deal.paid_at) {
    const { data: pa } = await supabase
      .from("artist_payout_accounts")
      .select("status")
      .eq("artist_id", user.id)
      .maybeSingle();
    artistPayoutActive = pa?.status === "active";
  }

  // Campaign context, if this deal belongs to one.
  let campaignName: string | null = null;
  let campaignOffer: { compensation_type: string | null; offer_description: string | null; product_value: number | null } | null = null;
  let brief: Brief | null = null;
  let isGifting = false;
  if (deal.campaign_id) {
    const { data: c } = await supabase
      .from("campaigns")
      .select(
        "name, compensation_type, offer_description, product_value, required_hashtags, required_mentions, dos, donts, disclosure_required"
      )
      .eq("id", deal.campaign_id)
      .maybeSingle();
    campaignName = c?.name ?? null;
    if (c) {
      campaignOffer = {
        compensation_type: c.compensation_type ?? null,
        offer_description: c.offer_description ?? null,
        product_value: c.product_value ?? null,
      };
      isGifting =
        c.compensation_type === "gifted" || c.compensation_type === "paid_product";
      const b: Brief = {
        required_hashtags: c.required_hashtags ?? [],
        required_mentions: c.required_mentions ?? [],
        dos: c.dos ?? null,
        donts: c.donts ?? null,
        disclosure_required: !!c.disclosure_required,
      };
      // Only surface the brief card if there's something in it.
      if (
        b.required_hashtags.length ||
        b.required_mentions.length ||
        b.dos ||
        b.donts ||
        b.disclosure_required
      ) {
        brief = b;
      }
    }
  }

  // Execution layer: deliverables, shipment, and the artist's promo code —
  // only relevant once the collaboration is on, so we skip the queries on
  // still-pending offers/pitches.
  const collaborating =
    deal.status === "accepted" || deal.status === "completed" || !!deal.paid_at;

  let deliverables: DealDeliverable[] = [];
  let shipment: DealShipment | null = null;
  if (collaborating) {
    const { data: deliverableRows } = await supabase
      .from("deal_deliverables")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: true });
    deliverables = (deliverableRows as DealDeliverable[] | null) ?? [];

    const { data: shipmentRow } = await supabase
      .from("deal_shipments")
      .select("*")
      .eq("deal_id", id)
      .maybeSingle<DealShipment>();
    shipment = shipmentRow ?? null;
  }

  let promoCode: PromoCode | null = null;
  if (deal.campaign_id) {
    const { data: pc } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("campaign_id", deal.campaign_id)
      .eq("artist_id", deal.artist_id)
      .maybeSingle<PromoCode>();
    promoCode = pc ?? null;
  }
  const showSeeding = collaborating && (isGifting || !!shipment);

  // Reviews for this deal (both directions) — only once marked completed.
  const reviewable = deal.status === "completed";
  let myReview: Review | null = null;
  let theirReview: Review | null = null;
  if (reviewable) {
    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("*")
      .eq("deal_id", id);
    const rows = (reviewRows as Review[] | null) ?? [];
    myReview = rows.find((r) => r.reviewer_id === user.id) ?? null;
    theirReview = rows.find((r) => r.reviewer_id !== user.id) ?? null;
  }

  // Resolve the counterparty (public view; no sensitive data) + their rating.
  let counterpartyName = profile.role === "artist" ? "A brand" : "Artist";
  let counterpartyAvatar: string | null = null;
  let counterpartyHref: string | null = null;
  let counterpartyRating: Rating | null = null;

  if (profile.role === "artist") {
    const { data: brand } = await supabase
      .from("brand_public")
      .select("*")
      .eq("brand_id", deal.brand_id)
      .maybeSingle<BrandPublic>();
    if (brand) {
      counterpartyName = brand.company_name ?? "A brand";
      counterpartyAvatar = brand.logo_url;
    }
    const { data: r } = await supabase
      .from("brand_ratings")
      .select("avg_rating, review_count")
      .eq("brand_id", deal.brand_id)
      .maybeSingle<Rating>();
    counterpartyRating = r ?? null;
  } else {
    const { data: artist } = await supabase
      .from("artist_public_stats")
      .select("*")
      .eq("artist_id", deal.artist_id)
      .maybeSingle<ArtistPublicStats>();
    if (artist) {
      counterpartyName = artist.display_name ?? `@${artist.username}`;
      counterpartyAvatar = artist.profile_picture_url;
      counterpartyHref = `/artists/${deal.artist_id}`;
    }
    const { data: r } = await supabase
      .from("artist_ratings")
      .select("avg_rating, review_count")
      .eq("artist_id", deal.artist_id)
      .maybeSingle<Rating>();
    counterpartyRating = r ?? null;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/deals">
          <ArrowLeft /> All deals
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {counterpartyAvatar ? (
              <Image
                src={counterpartyAvatar}
                alt={counterpartyName}
                width={48}
                height={48}
                unoptimized
                className="size-12 rounded-full border object-cover"
              />
            ) : (
              <div className="size-12 rounded-full bg-muted" />
            )}
            <div>
              <CardTitle className="text-lg text-navy">
                {counterpartyHref ? (
                  <Link href={counterpartyHref} className="hover:underline">
                    {counterpartyName}
                  </Link>
                ) : (
                  counterpartyName
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isPitch
                  ? profile.role === "brand"
                    ? "pitched you a collaboration"
                    : "your pitch"
                  : profile.role === "artist"
                    ? "sent you a collab offer"
                    : "your collab offer"}
              </p>
              {counterpartyRating && counterpartyRating.review_count > 0 && (
                <StarRating
                  value={counterpartyRating.avg_rating}
                  count={counterpartyRating.review_count}
                  className="mt-0.5"
                />
              )}
              {campaignName && (
                <p className="text-xs text-muted-foreground">
                  Campaign: {campaignName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPitch && <Badge variant="outline">Pitch</Badge>}
            <DealStatusBadge status={deal.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Terms */}
          <div className="rounded-xl bg-secondary/50 p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="font-medium text-navy">Budget: </span>
                {deal.offer_amount != null
                  ? formatMoney(deal.offer_amount, deal.currency)
                  : "To discuss"}
              </div>
              {deal.product_description && (
                <div>
                  <span className="font-medium text-navy">Deliverables: </span>
                  {deal.product_description}
                </div>
              )}
              {campaignOffer && compensationLabel(campaignOffer.compensation_type) && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-navy">Offering: </span>
                  {compensationLabel(campaignOffer.compensation_type)}
                  {campaignOffer.offer_description ? ` · ${campaignOffer.offer_description}` : ""}
                  {campaignOffer.product_value != null
                    ? ` · product worth ${formatMoney(campaignOffer.product_value, deal.currency)}`
                    : ""}
                </div>
              )}
            </div>
          </div>

          {deal.paid_at && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm font-medium text-emerald-700">
              Paid
              {deal.offer_amount != null
                ? ` ${formatMoney(deal.offer_amount, deal.currency)}`
                : ""}{" "}
              · <LocalDate iso={deal.paid_at} />
            </div>
          )}

          {profile.role === "artist" &&
            deal.offer_amount != null &&
            deal.offer_amount > 0 && (
              <p className="text-sm text-muted-foreground">
                {deal.paid_at ? "You received " : "You'll receive "}
                <span className="font-semibold text-navy">
                  {formatMoney(artistShare(deal.offer_amount), deal.currency)}
                </span>{" "}
                after the {PLATFORM_FEE_PERCENT}% Muabox platform fee — paid
                straight to your bank.
              </p>
            )}

          {profile.role === "artist" && deal.paid_at && !artistPayoutActive && (
            <div className="rounded-xl border border-yellow/40 bg-yellow/10 px-4 py-2.5 text-sm text-navy">
              This payment is waiting for your payout details.{" "}
              <Link href="/settings" className="font-medium underline">
                Set up payouts
              </Link>{" "}
              to receive it in your bank account.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <DealActions
              dealId={deal.id}
              role={profile.role}
              status={deal.status}
              initiatedBy={deal.initiated_by}
            />
            {profile.role === "brand" &&
              !isPitch &&
              (deal.status === "sent" || deal.status === "viewed") && (
                <>
                  <RemindButton dealId={deal.id} remindedAt={deal.reminded_at} />
                  <ConfirmButton
                    label="Withdraw"
                    variant="outline"
                    size="default"
                    title="Withdraw this offer?"
                    description="The artist will no longer be able to accept it. You can always send a fresh offer later."
                    confirmLabel="Yes, withdraw"
                    successMessage="Offer withdrawn"
                    action={async () => {
                      "use server";
                      await withdrawDeal(deal.id);
                    }}
                  />
                </>
              )}
            {profile.role === "brand" &&
              !deal.paid_at &&
              (deal.status === "accepted" || deal.status === "completed") &&
              deal.offer_amount != null &&
              deal.offer_amount > 0 && (
                <PayDealButton
                  dealId={deal.id}
                  amountLabel={formatMoney(deal.offer_amount, deal.currency) ?? ""}
                />
              )}
          </div>

          {profile.role === "artist" &&
            !deal.paid_at &&
            deal.status === "accepted" && (
              <p className="text-sm text-muted-foreground">
                Payment pending from the brand.
              </p>
            )}

          {profile.role === "brand" &&
            !deal.paid_at &&
            (deal.status === "accepted" || deal.status === "completed") &&
            (deal.offer_amount == null || deal.offer_amount <= 0) && (
              <p className="text-sm text-muted-foreground">
                This deal has no budget set. Agree on an amount in chat, then
                send a new offer with that amount to pay securely via Razorpay.
              </p>
            )}
        </CardContent>
      </Card>

      {/* The artist's promo code for this campaign. */}
      {promoCode && (
        <PromoCodeCallout promo={promoCode} role={profile.role} />
      )}

      {/* Creative brief + ASCI disclosure. */}
      {brief && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy">Creative brief</CardTitle>
          </CardHeader>
          <CardContent>
            <BriefCard
              dealId={deal.id}
              role={profile.role}
              brief={brief}
              disclosureConfirmedAt={deal.disclosure_confirmed_at}
            />
          </CardContent>
        </Card>
      )}

      {/* Deliverables & content proof — once the collaboration is on. */}
      {collaborating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy">
              Deliverables &amp; proof
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DeliverablesSection
              dealId={deal.id}
              role={profile.role}
              deliverables={deliverables}
            />
          </CardContent>
        </Card>
      )}

      {/* Product seeding logistics — gifting deals. */}
      {showSeeding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy">
              Product shipping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShipmentSection
              dealId={deal.id}
              role={profile.role}
              shipment={shipment}
            />
          </CardContent>
        </Card>
      )}

      {reviewable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy">Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {myReview ? (
              <div className="rounded-xl border bg-secondary/30 p-4">
                <p className="mb-1 text-sm font-medium text-navy">Your review</p>
                <StarRating value={myReview.rating} size="md" />
                {myReview.comment && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    “{myReview.comment}”
                  </p>
                )}
              </div>
            ) : (
              <ReviewForm dealId={deal.id} counterpartyName={counterpartyName} />
            )}

            {theirReview && (
              <div className="rounded-xl border p-4">
                <p className="mb-1 text-sm font-medium text-navy">
                  {counterpartyName}&apos;s review of you
                </p>
                <StarRating value={theirReview.rating} size="md" />
                {theirReview.comment && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    “{theirReview.comment}”
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <DealThread
            key={messages.length ? messages[messages.length - 1].id : "empty"}
            dealId={deal.id}
            currentUserId={user.id}
            initialMessages={messages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
