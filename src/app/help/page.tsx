import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata = { title: "Help & FAQ — Muabox" };

const ARTIST_FAQ = [
  {
    q: "How do I get brand deals?",
    a: "Connect your Instagram Professional account, fill in your bio, specialties and rate card, and turn on “accepting deals”. Brands browse the roster and send you offers — and you can pitch brands yourself from the Brands tab.",
  },
  {
    q: "Why do I need a Professional (Business/Creator) Instagram account?",
    a: "The official Instagram API only shares stats and media for Professional accounts. Switching is free in your Instagram settings and takes a minute.",
  },
  {
    q: "How do I get paid, and what does Muabox charge?",
    a: "When a brand pays for an accepted deal, the money is transferred to your bank via Razorpay automatically. Muabox keeps a small platform fee (shown on the payouts screen and on every deal); the rest is yours. Add your bank details under Profile → Payouts.",
  },
  {
    q: "Who can see my profile?",
    a: "Only brands, and only while you’re accepting deals. Use “Preview my profile” on your dashboard to see exactly what they see.",
  },
];

const BRAND_FAQ = [
  {
    q: "How do campaigns work?",
    a: "Create a campaign with a budget and a brief, then invite artists in bulk from your shortlist. Muabox tracks committed spend against your budget, response rates, total reach, and estimated cost per 1,000 reach.",
  },
  {
    q: "How do I find the right artists?",
    a: "Use Discover to filter by specialty, follower tier, engagement, location, rating and your budget. Save favourites with the heart, then invite them to a campaign — we even sort your shortlist by best match.",
  },
  {
    q: "How does payment work?",
    a: "Once an artist accepts, pay securely via Razorpay (UPI, cards, netbanking). The artist is paid out automatically. Everything is tracked on the deal and campaign pages.",
  },
  {
    q: "What if an artist doesn’t respond?",
    a: "Send a friendly reminder from the deal or campaign page (once every 48 hours). Your dashboard also flags invites that have gone quiet.",
  },
];

export default function HelpPage() {
  return (
    <main className="flex-1">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-navy">
            <Sparkles className="size-5" /> Muabox
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl space-y-10 px-6 py-12">
        <div>
          <h1 className="text-3xl font-bold text-navy">Help &amp; FAQ</h1>
          <p className="mt-1 text-muted-foreground">
            Everything you need to make the most of Muabox. Still stuck? Email{" "}
            <a href="mailto:support@muabox.app" className="underline">
              support@muabox.app
            </a>
            .
          </p>
        </div>

        <Section title="For makeup artists" items={ARTIST_FAQ} />
        <Section title="For brands" items={BRAND_FAQ} />
      </article>
    </main>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: { q: string; a: string }[];
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-navy">{title}</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border bg-card p-4 shadow-soft"
          >
            <summary className="cursor-pointer list-none font-medium text-navy [&::-webkit-details-marker]:hidden">
              {item.q}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
