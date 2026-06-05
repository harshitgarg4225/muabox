import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Muabox",
};

export default function TermsPage() {
  return (
    <main className="flex-1">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-navy">
            <Sparkles className="size-5" /> Muabox
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <div>
          <h1 className="text-3xl font-bold text-navy">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <p>
          Welcome to Muabox. By creating an account or using our service you agree
          to these Terms. Muabox is a marketplace that connects makeup artists
          (&quot;artists&quot;) with skincare and beauty brands (&quot;brands&quot;)
          for paid PR collaborations.
        </p>

        <Section title="Accounts">
          You must provide accurate information and are responsible for activity
          under your account. Artists may connect an Instagram Professional
          account; you confirm you own that account and consent to the data use
          described in our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </Section>

        <Section title="Collaborations & deals">
          Brands may send collaboration offers to artists who are accepting deals.
          Artists may accept or decline. A deal is an agreement strictly between
          the brand and the artist; Muabox is a facilitator and is not a party to
          that agreement.
        </Section>

        <Section title="Payments & payouts">
          Payments are processed by <strong>Razorpay</strong>. When a brand pays
          for a deal, Muabox transfers the artist&apos;s share to their connected
          account via Razorpay Route, less a platform service fee disclosed at the
          time. You are responsible for your own taxes. Refunds and disputes are
          handled per Razorpay&apos;s policies and applicable law.
        </Section>

        <Section title="Acceptable use">
          Don&apos;t misuse the platform: no fraud, harassment, spam, scraping,
          infringing content, or attempts to circumvent fees. We may suspend
          accounts that violate these Terms.
        </Section>

        <Section title="Content & data">
          You retain rights to your content. You grant Muabox a limited licence to
          display your profile and Instagram data within the product so brands can
          evaluate you. We handle data as described in the Privacy Policy and honor
          deletion requests.
        </Section>

        <Section title="Disclaimers & liability">
          The service is provided &quot;as is&quot;. To the maximum extent
          permitted by law, Muabox is not liable for indirect or consequential
          damages, or for the conduct of any brand or artist.
        </Section>

        <Section title="Changes & contact">
          We may update these Terms; continued use means you accept the changes.
          Questions? Email{" "}
          <a href="mailto:support@muabox.app" className="underline">
            support@muabox.app
          </a>
          .
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-navy">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
