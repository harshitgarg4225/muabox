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
  is_admin: boolean;
  suspended: boolean;
  email_notifications: boolean;
  whatsapp: string | null;
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
  specialties: string[];
  rate_card: { deliverable: string; price: number | null }[];
  collab_types: string[];
  min_budget: number | null;
  created_at: string;
};

export type Brand = {
  id: string;
  company_name: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  open_to_pitches: boolean;
  created_at: string;
};

export type CampaignStatus = "active" | "closed";

export type Campaign = {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  product: string | null;
  budget: number | null;          // paise; null = no fixed budget
  status: CampaignStatus;
  target_specialties: string[];
  compensation_type: string | null;
  offer_description: string | null;
  product_value: number | null;
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
  paid_at: string | null;
  campaign_id: string | null;
  initiated_by: UserRole;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  deal_id: string;
  brand_id: string;
  artist_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed";
  transfer_id: string | null;
  transfer_status: "none" | "pending" | "done" | "failed";
  transferred_amount: number | null;
  created_at: string;
  updated_at: string;
};

export type ArtistPayoutAccount = {
  artist_id: string;
  razorpay_account_id: string | null;
  razorpay_product_id: string | null;
  status: "pending" | "active" | "failed";
  bank_last4: string | null;
  beneficiary_name: string | null;
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
  engagement_rate: number | null;
  specialties: string[];
  rate_card: { deliverable: string; price: number | null }[];
  collab_types: string[];
  min_budget: number | null;
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
  open_to_pitches: boolean;
};

export type Review = {
  id: string;
  deal_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: UserRole;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type Rating = { avg_rating: number; review_count: number };

/** Format minor currency units (paise) as a display string. */
export function formatMoney(minor: number | null, currency = "INR") {
  if (minor == null) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
