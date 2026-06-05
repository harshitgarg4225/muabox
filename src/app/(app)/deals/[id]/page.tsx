import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markDealRead } from "@/app/(app)/deals/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { DealActions } from "@/components/deal-actions";
import { DealThread } from "@/components/deal-thread";
import { PayDealButton } from "@/components/pay-deal-button";
import {
  formatMoney,
  type Deal,
  type DealMessage,
  type ArtistPublicStats,
  type BrandPublic,
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

  // Mark read (and bump sent->viewed for the artist) before rendering.
  await markDealRead(id);

  const { data: messageRows } = await supabase
    .from("deal_messages")
    .select("*")
    .eq("deal_id", id)
    .order("created_at", { ascending: true });

  // The original offer note reads as the brand's opening message.
  const opening: DealMessage[] = deal.message
    ? [
        {
          id: `offer-${deal.id}`,
          deal_id: deal.id,
          sender_id: deal.brand_id,
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

  // Resolve the counterparty (public view; no sensitive data).
  let counterpartyName = profile.role === "artist" ? "A brand" : "Artist";
  let counterpartyAvatar: string | null = null;
  let counterpartyHref: string | null = null;

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
                {profile.role === "artist"
                  ? "sent you a collab offer"
                  : "your collab offer"}
              </p>
            </div>
          </div>
          <DealStatusBadge status={deal.status} />
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
            </div>
          </div>

          {deal.paid_at && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm font-medium text-emerald-700">
              Paid {formatMoney(deal.offer_amount, deal.currency)} ·{" "}
              {new Date(deal.paid_at).toLocaleDateString()}
            </div>
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
            />
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
