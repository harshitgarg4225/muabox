// Demo seed: a brand + several luxury MUAs so the marketplace looks alive.
// Run with:  npm run seed   (uses --env-file=.env.local; needs Node >=20.6)
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const PASSWORD = "muabox-demo-123";

const ARTISTS = [
  { name: "Mia Kapoor", user: "glow.by.mia", loc: "Mumbai, India", followers: 48200, eng: 6.1, specialties: ["Bridal", "Editorial"], rate: 25000, min: 15000 },
  { name: "Jade Fernandes", user: "skinbyjade", loc: "Goa, India", followers: 112000, eng: 4.8, specialties: ["Editorial", "Fashion & Runway"], rate: 60000, min: 40000 },
  { name: "Riya Sethi", user: "riya.muah", loc: "Delhi, India", followers: 23500, eng: 8.3, specialties: ["Bridal", "Destination Weddings"], rate: 18000, min: 10000 },
  { name: "Ananya Rao", user: "ananya.glam", loc: "Bengaluru, India", followers: 76000, eng: 5.4, specialties: ["Celebrity", "Editorial"], rate: 45000, min: 30000 },
  { name: "Sara Khan", user: "sara.beauty", loc: "Hyderabad, India", followers: 9400, eng: 9.1, specialties: ["HD & Airbrush", "Bridal"], rate: 8000, min: 5000 },
  { name: "Tara Mehta", user: "tara.artistry", loc: "Pune, India", followers: 305000, eng: 3.9, specialties: ["Fashion & Runway", "SFX & Avant-garde"], rate: 120000, min: 80000 },
];

const COLLAB = ["Paid", "Gifted / barter", "Paid + product"];

async function makeUser(email, role, full_name) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) {
    if (String(error.message).includes("already")) {
      const { data: list } = await admin.auth.admin.listUsers();
      const found = list.users.find((u) => u.email === email);
      if (found) return found.id;
    }
    throw error;
  }
  await admin.from("profiles").upsert({ id: data.user.id, role, full_name, email });
  return data.user.id;
}

async function seedArtist(a) {
  const email = `${a.user}@demo.muabox.app`;
  const id = await makeUser(email, "artist", a.name);

  await admin.from("artists").upsert({
    id,
    display_name: a.name,
    bio: `${a.specialties.join(" & ")} makeup artist. Available for PR collaborations and editorial work.`,
    location: a.loc,
    accepting_deals: true,
    pricing: "fixed",
    price_min: a.min * 100,
    price_max: a.rate * 100,
    currency: "INR",
    specialties: a.specialties,
    collab_types: COLLAB,
    min_budget: a.min * 100,
    rate_card: [
      { deliverable: "Instagram Reel", price: a.rate * 100 },
      { deliverable: "Instagram Story (per story)", price: Math.round(a.rate * 0.25) * 100 },
      { deliverable: "Feed Post", price: Math.round(a.rate * 0.7) * 100 },
    ],
  });

  const { data: acct } = await admin
    .from("instagram_accounts")
    .upsert(
      {
        artist_id: id,
        ig_user_id: `demo_${a.user}`,
        username: a.user,
        account_type: "BUSINESS",
        followers_count: a.followers,
        follows_count: 800,
        media_count: 240,
        profile_picture_url: `https://picsum.photos/seed/${a.user}/200`,
        biography: a.specialties.join(" · "),
        engagement_rate: a.eng,
        access_token_encrypted: "seed",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "artist_id" }
    )
    .select("id")
    .single();

  if (acct) {
    await admin.from("instagram_media").delete().eq("instagram_account_id", acct.id);
    const media = Array.from({ length: 6 }).map((_, i) => ({
      instagram_account_id: acct.id,
      ig_media_id: `demo_${a.user}_${i}`,
      caption: "Behind the look ✨",
      media_type: "IMAGE",
      media_url: `https://picsum.photos/seed/${a.user}${i}/600/600`,
      permalink: "https://instagram.com",
      like_count: Math.round(a.followers * (a.eng / 100) * 0.9),
      comments_count: Math.round(a.followers * (a.eng / 100) * 0.1),
      posted_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    await admin.from("instagram_media").insert(media);
  }
  console.log(`  ✓ artist ${a.name} (${email})`);
}

async function main() {
  console.log("Seeding demo brand…");
  const brandId = await makeUser("brand@demo.muabox.app", "brand", "Lumière Skincare");
  await admin.from("brands").upsert({
    id: brandId,
    company_name: "Lumière Skincare",
    website: "https://example.com",
    description: "Clean, luxury skincare. We collaborate with India's finest makeup artists.",
    open_to_pitches: true,
  });
  console.log("  ✓ brand Lumière Skincare (brand@demo.muabox.app)");

  console.log("Seeding demo artists…");
  for (const a of ARTISTS) {
    try {
      await seedArtist(a);
    } catch (e) {
      console.error(`  ✗ ${a.name}:`, e.message);
    }
  }

  console.log("\nDone! Log in with any of the above emails · password:", PASSWORD);
}

main().then(() => process.exit(0));
