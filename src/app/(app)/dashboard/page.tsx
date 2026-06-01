import Link from "next/link";
import { Camera, Inbox, Send, ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AcceptingToggle } from "@/components/accepting-toggle";
import { RefreshStatsButton } from "@/components/refresh-stats-button";
import { StatGrid, MediaGallery, IgHeader } from "@/components/profile-stats";
import type {
  Artist,
  Brand,
  Deal,
  InstagramAccount,
  InstagramMedia,
} from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; ig_error?: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");

  const sp = await searchParams;

  return profile.role === "artist" ? (
    <ArtistDashboard userId={user.id} flags={sp} />
  ) : (
    <BrandDashboard userId={user.id} />
  );
}

function Banner({
  connected,
  igError,
}: {
  connected?: string;
  igError?: string;
}) {
  if (connected) {
    return (
      <div className="rounded-md border border-green-600/30 bg-green-600/10 px-4 py-2 text-sm">
        Instagram connected — your stats are live below.
      </div>
    );
  }
  if (igError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm">
        Instagram connection failed ({igError}). Please try again.
      </div>
    );
  }
  return null;
}

async function ArtistDashboard({
  userId,
  flags,
}: {
  userId: string;
  flags: { connected?: string; ig_error?: string };
}) {
  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Artist>();

  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("artist_id", userId)
    .maybeSingle<InstagramAccount>();

  let media: InstagramMedia[] = [];
  if (account) {
    const { data } = await supabase
      .from("instagram_media")
      .select("*")
      .eq("instagram_account_id", account.id)
      .order("posted_at", { ascending: false });
    media = (data as InstagramMedia[]) ?? [];
  }

  const { count: dealCount } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", userId);

  return (
    <div className="space-y-6">
      <Banner connected={flags.connected} igError={flags.ig_error} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">
          {artist?.display_name ?? "Your"} dashboard
        </h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/deals">
            <Inbox /> {dealCount ?? 0} deals
          </Link>
        </Button>
      </div>

      {!account ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-5" /> Connect your Instagram
            </CardTitle>
            <CardDescription>
              Link your Instagram <strong>Professional</strong> account
              (Business or Creator) to auto-fill your follower count, recent
              media and engagement. Personal accounts aren&apos;t supported by
              the Instagram API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="accent">
              <a href="/api/instagram/connect">
                <Camera /> Connect Instagram
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Need to switch?{" "}
              <a
                href="https://help.instagram.com/502981923235522"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline"
              >
                Convert to a Professional account <ExternalLink className="size-3" />
              </a>
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <IgHeader account={account} />
              <RefreshStatsButton />
            </CardHeader>
            <CardContent className="space-y-4">
              <StatGrid account={account} media={media} />
              {account.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced{" "}
                  {new Date(account.last_synced_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          <AcceptingToggle initial={artist?.accepting_deals ?? false} />

          <Card>
            <CardHeader>
              <CardTitle>Recent media</CardTitle>
              <CardDescription>
                The latest posts brands will see on your profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MediaGallery media={media} />
            </CardContent>
          </Card>

          <div>
            <Button asChild variant="outline">
              <Link href="/settings">Edit profile &amp; pricing</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

async function BrandDashboard({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Brand>();

  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("brand_id", userId)
    .order("created_at", { ascending: false });

  const sent = (deals as Deal[]) ?? [];
  const byStatus = {
    open: sent.filter((d) => d.status === "sent" || d.status === "viewed").length,
    accepted: sent.filter((d) => d.status === "accepted").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">
          {brand?.company_name ?? "Brand"} dashboard
        </h1>
        <Button asChild>
          <Link href="/discover">Discover artists</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Deals sent" value={sent.length} icon={<Send />} />
        <SummaryCard label="Awaiting reply" value={byStatus.open} icon={<Inbox />} />
        <SummaryCard
          label="Accepted"
          value={byStatus.accepted}
          icon={<Send />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your sent deals</CardTitle>
          <CardDescription>Track the status of your offers.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No deals yet.{" "}
              <Link href="/discover" className="underline">
                Discover artists
              </Link>{" "}
              to send your first offer.
            </p>
          ) : (
            <Button asChild variant="outline">
              <Link href="/deals">View all deals</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {brand && !brand.company_name && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
          Finish setting up your brand profile.{" "}
          <Link href="/settings" className="underline">
            Go to profile
          </Link>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

export const dynamic = "force-dynamic";
