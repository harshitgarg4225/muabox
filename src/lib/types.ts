export type UserRole = "artist" | "brand";
export type PricingModel = "fixed" | "custom";
export type DealStatus =
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "completed";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export type Artist = {
  id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  accepting_deals: boolean;
  pricing: PricingModel;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  created_at: string;
};

export type Brand = {
  id: string;
  company_name: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  created_at: string;
};

export type InstagramAccount = {
  id: string;
  artist_id: string;
  ig_user_id: string;
  username: string | null;
  account_type: string | null;
  followers_count: number | null;
  follows_count: number | null;
  media_count: number | null;
  profile_picture_url: string | null;
  biography: string | null;
  website: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
};

export type InstagramMedia = {
  id: string;
  instagram_account_id: string;
  ig_media_id: string;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  like_count: number | null;
  comments_count: number | null;
  posted_at: string | null;
};

export type Deal = {
  id: string;
  brand_id: string;
  artist_id: string;
  status: DealStatus;
  message: string | null;
  offer_amount: number | null;
  currency: string;
  product_description: string | null;
  brand_read_at: string | null;
  artist_read_at: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DealMessage = {
  id: string;
  deal_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ArtistPublicStats = {
  artist_id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  accepting_deals: boolean;
  pricing: PricingModel;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  username: string | null;
  followers_count: number | null;
  media_count: number | null;
  profile_picture_url: string | null;
  biography: string | null;
  created_at: string;
};

export type ArtistPublicMedia = {
  artist_id: string;
  id: string;
  ig_media_id: string;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  like_count: number | null;
  comments_count: number | null;
  posted_at: string | null;
};

export type BrandPublic = {
  brand_id: string;
  company_name: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
};

/** Format minor currency units (cents) as a display string. */
export function formatMoney(minor: number | null, currency = "USD") {
  if (minor == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
