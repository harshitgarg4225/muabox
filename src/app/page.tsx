import Link from "next/link";
import { Sparkles, Camera, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="size-5" /> Muabox
          </span>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Where makeup artists meet skincare brands
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
          Artists connect Instagram in one tap and set their deal preferences.
          Brands browse a roster of consented creators and send PR collab
          offers. No scraping, no spam — just real, opted-in collaborations.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/login?role=artist">I&apos;m an artist</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login?role=brand">I&apos;m a brand</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          {
            icon: Camera,
            title: "Connect Instagram",
            body: "Artists link their professional account. Follower count, recent media and engagement auto-fill via the official Instagram API.",
          },
          {
            icon: Sparkles,
            title: "Set your terms",
            body: "Toggle whether you're accepting deals and set fixed pricing tiers or 'contact me'. You're always in control.",
          },
          {
            icon: Handshake,
            title: "Send & receive deals",
            body: "Brands send PR collab offers with a message, optional budget and product. Artists accept or decline in a tap.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardContent className="space-y-2">
              <Icon className="size-6" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Muabox</span>
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </main>
  );
}
