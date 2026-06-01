import Image from "next/image";
import type { InstagramAccount, InstagramMedia } from "@/lib/types";
import { engagementRate } from "@/lib/instagram";

function compact(n: number | null | undefined) {
  if (n == null) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

export function StatGrid({
  account,
  media,
}: {
  account: Pick<
    InstagramAccount,
    "followers_count" | "follows_count" | "media_count"
  >;
  media: Pick<InstagramMedia, "like_count" | "comments_count">[];
}) {
  const er = engagementRate(media, account.followers_count);
  const stats = [
    { label: "Followers", value: compact(account.followers_count) },
    { label: "Following", value: compact(account.follows_count) },
    { label: "Posts", value: compact(account.media_count) },
    { label: "Engagement", value: `${er}%` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function MediaGallery({
  media,
}: {
  media: Pick<
    InstagramMedia,
    "id" | "media_url" | "thumbnail_url" | "permalink" | "media_type" | "caption"
  >[];
}) {
  if (media.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No recent media to show.</p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {media.map((m) => {
        const src =
          m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url ?? m.thumbnail_url;
        return (
          <a
            key={m.id}
            href={m.permalink ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="relative aspect-square overflow-hidden rounded-md bg-muted"
          >
            {src ? (
              // Instagram CDN host varies; use a plain img to avoid remote loader config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={m.caption?.slice(0, 80) ?? "Instagram media"}
                className="h-full w-full object-cover transition-transform hover:scale-105"
                loading="lazy"
              />
            ) : null}
          </a>
        );
      })}
    </div>
  );
}

/** Avatar + username header for an Instagram profile. */
export function IgHeader({
  account,
}: {
  account: Pick<InstagramAccount, "username" | "profile_picture_url" | "biography">;
}) {
  return (
    <div className="flex items-center gap-4">
      {account.profile_picture_url ? (
        <Image
          src={account.profile_picture_url}
          alt={account.username ?? "profile"}
          width={56}
          height={56}
          unoptimized
          className="size-14 rounded-full object-cover"
        />
      ) : (
        <div className="size-14 rounded-full bg-muted" />
      )}
      <div>
        <div className="font-semibold">@{account.username ?? "unknown"}</div>
        {account.biography ? (
          <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">
            {account.biography}
          </p>
        ) : null}
      </div>
    </div>
  );
}
