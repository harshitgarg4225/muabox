import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Muabox",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5" /> Muabox
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
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
          Muabox (&quot;we&quot;, &quot;us&quot;) operates a marketplace that
          connects makeup artists with skincare brands for PR collaborations.
          This policy explains what data we collect, why, and how you can have
          it deleted. We only collect data with your explicit consent.
        </p>

        <Section title="Account data">
          When you sign up we store your email address and your role (artist or
          brand), plus the profile details you choose to provide (display name,
          bio, location, pricing, or company name, website and logo).
        </Section>

        <Section title="Instagram data (artists only)">
          <p>
            If you connect your Instagram Professional account, we use the
            official <em>Instagram API with Instagram Login</em> and the{" "}
            <code>instagram_business_basic</code> permission to collect, with
            your consent:
          </p>
          <ul className="ml-6 list-disc space-y-1">
            <li>your Instagram username and account type;</li>
            <li>your follower, following and media counts;</li>
            <li>your profile picture, biography and website;</li>
            <li>
              your recent media (images, captions, permalinks, like and comment
              counts).
            </li>
          </ul>
          <p>
            We use this to display your profile and let brands evaluate you for
            PR collaborations. We compute an engagement rate from your recent
            media. Your Instagram access token is encrypted at rest and is never
            shared with brands or any third party.
          </p>
        </Section>

        <Section title="Collaboration data">
          <p>
            To run a collaboration you agree to, we store the content you
            exchange — deal terms and messages, the live post links artists
            submit as proof of work, and reviews.
          </p>
          <p>
            For product-gifting deals, an artist may choose to share a shipping
            address (name, address, pincode and phone) so the brand can send the
            product. This is provided with your explicit consent, is visible only
            to the brand on that specific deal, and is deleted when your account
            is deleted.
          </p>
        </Section>

        <Section title="How we use data">
          We use your data to operate the marketplace: showing artist profiles
          to brands who you have consented to be discoverable by, delivering deal
          offers between brands and artists, and helping both sides run and
          measure a collaboration. We do not sell your data, and we do not
          collect data from accounts that have not connected to Muabox.
        </Section>

        <Section title="Deleting your data">
          <p>You can remove your data at any time by either:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              removing Muabox from your Instagram settings (Settings → Apps and
              Websites), which triggers an automatic disconnect and deletion of
              your stored Instagram data; or
            </li>
            <li>
              emailing us to request full account deletion at{" "}
              <a href="mailto:privacy@muabox.app" className="underline">
                privacy@muabox.app
              </a>
              .
            </li>
          </ul>
          <p>
            When Instagram sends us a data deletion request on your behalf, we
            delete your stored Instagram account and media and return a
            confirmation code you can track at{" "}
            <Link href="/data-deletion-status" className="underline">
              /data-deletion-status
            </Link>
            .
          </p>
        </Section>

        <Section title="Contact">
          Questions about this policy? Email{" "}
          <a href="mailto:privacy@muabox.app" className="underline">
            privacy@muabox.app
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
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
