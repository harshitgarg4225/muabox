import Link from "next/link";
import {
  Sparkles,
  Camera,
  Handshake,
  ArrowRight,
  Star,
  ShieldCheck,
  Zap,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex-1">
      <SiteNav />

      {/* Hero */}
      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
          <div className="animate-rise mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm font-medium text-navy shadow-soft">
              <Star className="size-3.5 fill-yellow text-yellow" />
              India&apos;s luxury MUA × skincare marketplace
            </span>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-navy sm:text-6xl">
              Where luxury makeup artists meet{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">skincare brands</span>
                <span className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-yellow/70" />
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
              Bridal, editorial, celebrity — the finest MUAs connect Instagram
              in one tap and set their terms. Skincare brands run budgeted
              campaigns across a hand-opted-in roster. No scraping. No spam.
              Just collabs that want to happen.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link href="/login?role=artist">
                  <Camera /> I&apos;m an artist
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/login?role=brand">
                  I&apos;m a brand <ArrowRight />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free to join · Connect with the official Instagram API
            </p>
          </div>

          {/* Floating preview cards */}
          <div className="animate-rise mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
            <PreviewCard
              emoji="💄"
              name="@glow.by.mia"
              meta="48.2K followers · 6.1% eng."
              tag="Accepting deals"
            />
            <PreviewCard
              emoji="✨"
              name="@skinbyjade"
              meta="112K followers · 4.8% eng."
              tag="Fixed pricing"
              featured
            />
            <PreviewCard
              emoji="🧴"
              name="@derma.daily"
              meta="23.5K followers · 8.3% eng."
              tag="Accepting deals"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-navy">
          How Muabox works
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: Camera,
              step: "01",
              title: "Connect Instagram",
              body: "Artists link their professional account. Followers, recent media and engagement auto-fill via the official Instagram API.",
            },
            {
              icon: Sparkles,
              step: "02",
              title: "Set your terms",
              body: "Toggle whether you're accepting deals and add fixed pricing tiers or 'contact me'. You're always in control.",
            },
            {
              icon: Handshake,
              step: "03",
              title: "Send & receive deals",
              body: "Brands send PR offers with a message, budget and product. Artists accept or decline in a single tap.",
            },
          ].map(({ icon: Icon, step, title, body }) => (
            <div key={step} className="relative">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-navy text-white shadow-soft">
                <Icon className="size-6" />
              </div>
              <div className="mt-4 text-sm font-semibold text-amber-700">
                STEP {step}
              </div>
              <h3 className="mt-1 text-xl font-semibold text-navy">{title}</h3>
              <p className="mt-2 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 text-center sm:grid-cols-3">
          {[
            { icon: Users, value: "100%", label: "Consented creators" },
            { icon: Zap, value: "1 tap", label: "Instagram connect" },
            { icon: ShieldCheck, value: "₹0", label: "To get started" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="size-7 text-yellow" />
              <div className="text-4xl font-bold text-yellow">{value}</div>
              <div className="text-white/70">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Dual audience */}
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-20 md:grid-cols-2">
        <AudienceCard
          kind="For artists"
          title="Get discovered & get paid"
          points={[
            "Auto-filled profile from your real Instagram stats",
            "Set your niches, your pricing, your terms",
            "Receive offers — or pitch brands yourself",
          ]}
          href="/login?role=artist"
          cta="Join as an artist"
          accent
        />
        <AudienceCard
          kind="For brands"
          title="Find the right faces, fast"
          points={[
            "Filter luxury niches — bridal, editorial, celebrity",
            "Run budgeted campaigns and invite artists at scale",
            "Track responses, reach and cost per 1K — real ROI",
          ]}
          href="/login?role=brand"
          cta="Join as a brand"
        />
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl bg-navy px-8 py-14 text-center shadow-lift">
          <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">
            Ready to make your next collab happen?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Join Muabox today — it only takes a minute.
          </p>
          <div className="mt-7 flex justify-center">
            <Button asChild size="xl" variant="accent">
              <Link href="/login">
                Get started <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-navy"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-navy text-yellow">
            <Sparkles className="size-4" />
          </span>
          Muabox
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="accent">
            <Link href="/login">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function PreviewCard({
  emoji,
  name,
  meta,
  tag,
  featured,
}: {
  emoji: string;
  name: string;
  meta: string;
  tag: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-soft transition-transform hover:-translate-y-1 ${
        featured ? "sm:-translate-y-4 ring-2 ring-yellow" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-2xl">
          {emoji}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-navy">{name}</div>
          <div className="truncate text-xs text-muted-foreground">{meta}</div>
        </div>
      </div>
      <span className="mt-3 inline-flex rounded-full bg-yellow/20 px-2.5 py-1 text-xs font-medium text-amber-700">
        {tag}
      </span>
    </div>
  );
}

function AudienceCard({
  kind,
  title,
  points,
  href,
  cta,
  accent,
}: {
  kind: string;
  title: string;
  points: string[];
  href: string;
  cta: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-3xl border bg-card p-8 shadow-soft">
      <div className="text-sm font-semibold text-amber-700">{kind}</div>
      <h3 className="mt-1 text-2xl font-bold text-navy">{title}</h3>
      <ul className="mt-5 flex-1 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-muted-foreground">
            <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] text-yellow">
              ✓
            </span>
            {p}
          </li>
        ))}
      </ul>
      <Button asChild className="mt-6 w-fit" variant={accent ? "accent" : "default"}>
        <Link href={href}>
          {cta} <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <span className="flex items-center gap-2 font-semibold text-navy">
          <Sparkles className="size-4" /> Muabox
        </span>
        <span>© {new Date().getFullYear()} Muabox. All rights reserved.</span>
        <div className="flex gap-4">
          <Link href="/help" className="hover:text-navy hover:underline">
            Help
          </Link>
          <Link href="/terms" className="hover:text-navy hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-navy hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
