import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · CLIT Club",
  description: "The short version: it's a book club site, used at your own risk.",
};

// Google's OAuth branding page asks for a terms of service link alongside
// the privacy policy, on the same domain as the app's homepage.
const UPDATED = "September 15, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <div className="space-y-2">
        <h1 className="font-display text-3xl uppercase leading-none text-term-bright">
          <span className="text-term-dim">&gt;</span> Terms of Service
        </h1>
        <p className="label">Last updated {UPDATED}</p>
      </div>

      <Section title="What this is">
        <p>
          CLIT Club is a personal, non-commercial site that tracks what a small book club is
          reading and how everyone rated it. It&apos;s free, there&apos;s nothing to buy, and
          there are no accounts to create. Editing is limited to the club&apos;s organizer.
        </p>
      </Section>

      <Section title="Using it">
        <p>
          Reading the site is open to anyone. Don&apos;t attempt to break into it, disrupt it, or
          use it to store anything unlawful. The organizer may change or shut down the site at any
          time.
        </p>
      </Section>

      <Section title="Calendar invitations">
        <p>
          When a Google account is connected, the site creates and updates one calendar event per
          meeting and emails the club&apos;s members an invitation. Invitations are only sent to
          members the organizer has added.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          The site is provided as is, without warranties of any kind. It may be unavailable, it may
          lose data, and invitations may fail to send. The organizer isn&apos;t liable for any loss
          arising from its use.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions go to the club&apos;s organizer. See also the{" "}
          <Link href="/privacy" className="underline hover:text-term-bright">
            privacy policy
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel space-y-3 p-5 text-sm leading-relaxed text-term-fg">
      <h2 className="label text-term-fg">{title}</h2>
      {children}
    </section>
  );
}
