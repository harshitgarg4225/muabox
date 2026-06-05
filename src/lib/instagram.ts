/**
 * Instagram API with Instagram Login — helper layer.
 *
 * Base hosts:
 *  - authorize:       https://www.instagram.com/oauth/authorize
 *  - token exchange:  https://api.instagram.com/oauth/access_token
 *  - data:            https://graph.instagram.com
 *
 * Graph version is pinned in ONE place. Bump deliberately, not silently.
 */
export const GRAPH_VERSION = "v22.0";
export const GRAPH = `https://graph.instagram.com/${GRAPH_VERSION}`;
export const OAUTH_AUTHORIZE = "https://www.instagram.com/oauth/authorize";
export const OAUTH_TOKEN = "https://api.instagram.com/oauth/access_token";

// Round 1 scope only — fewest scopes = fastest App Review.
export const SCOPES = "instagram_business_basic";

const PROFILE_FIELDS = [
  "user_id",
  "username",
  "account_type",
  "followers_count",
  "follows_count",
  "media_count",
  "profile_picture_url",
  "biography",
  "website",
].join(",");

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "like_count",
  "comments_count",
].join(",");

export type IgProfile = {
  user_id: string;
  username?: string;
  account_type?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
};

export type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

export class InstagramError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "InstagramError";
  }
}

async function igFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json?.error) {
    const msg = json?.error?.message ?? `Instagram API error (${res.status})`;
    throw new InstagramError(msg, res.status);
  }
  return json as T;
}

/** Build the consent URL the artist is redirected to. */
export function buildAuthorizeUrl(state?: string) {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
    response_type: "code",
    scope: SCOPES,
  });
  if (state) params.set("state", state);
  return `${OAUTH_AUTHORIZE}?${params.toString()}`;
}

/** Exchange an authorization code for a short-lived token. */
export async function exchangeCodeForToken(code: string) {
  const res = await fetch(OAUTH_TOKEN, {
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
  const json = await res.json();
  if (!res.ok || json?.error_type || json?.error) {
    throw new InstagramError(
      json?.error_message ?? json?.error?.message ?? "token exchange failed",
      res.status
    );
  }
  return json as { access_token: string; user_id: string | number };
}

/** Exchange a short-lived token for a long-lived (60 day) token. */
export async function exchangeForLongLivedToken(shortToken: string) {
  const url =
    `${GRAPH}/access_token?grant_type=ig_exchange_token` +
    `&client_secret=${process.env.INSTAGRAM_APP_SECRET}` +
    `&access_token=${shortToken}`;
  return igFetch<{ access_token: string; token_type: string; expires_in: number }>(
    url
  );
}

/** Refresh a long-lived token (extends another 60 days). */
export async function refreshLongLivedToken(token: string) {
  const url =
    `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token` +
    `&access_token=${token}`;
  return igFetch<{ access_token: string; token_type: string; expires_in: number }>(
    url
  );
}

export async function fetchProfile(token: string) {
  return igFetch<IgProfile>(
    `${GRAPH}/me?fields=${PROFILE_FIELDS}&access_token=${token}`
  );
}

export async function fetchRecentMedia(token: string, limit = 12) {
  const json = await igFetch<{ data?: IgMedia[] }>(
    `${GRAPH}/me/media?fields=${MEDIA_FIELDS}&limit=${limit}&access_token=${token}`
  );
  return json.data ?? [];
}

/** Engagement rate = avg(likes + comments) / followers * 100. */
export function engagementRate(
  media: { like_count?: number | null; comments_count?: number | null }[],
  followers?: number | null
) {
  if (!followers || followers <= 0 || media.length === 0) return 0;
  const total = media.reduce(
    (sum, m) => sum + (m.like_count ?? 0) + (m.comments_count ?? 0),
    0
  );
  const avg = total / media.length;
  return Math.round((avg / followers) * 1000) / 10; // one decimal
}
