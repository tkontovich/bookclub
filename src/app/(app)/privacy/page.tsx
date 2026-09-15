import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · CLIT Club",
  description: "What this site stores, how it's used, and how to have it removed.",
};

// Google requires a reachable privacy policy on the app's own domain before
// an OAuth app can be published. It has to cover what Google user data the
// app accesses, how that data is used, shared, protected and deleted.
const UPDATED = "September 15, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <div className="space-y-2">
        <h1 className="font-display text-3xl uppercase leading-none text-term-bright">
          <span className="text-term-dim">&gt;</span> Privacy Policy
        </h1>
        <p className="label">Last updated {UPDATED}</p>
      </div>

      <Section title="Who runs this site">
        <p>
          CLIT Club is a private book club tracker run by one person for a small group of
          friends. It isn&apos;t a business, it has no advertising, and nothing on it is sold.
          For questions, or to have your information removed, contact the club&apos;s organizer.
        </p>
      </Section>

      <Section title="What the site stores">
        <ul className="list-inside list-disc space-y-1.5">
          <li>
            <span className="text-term-bright">Club records</span> — member first names, the books
            we read, who picked them, meeting dates, and the ratings given during meetings. These
            are visible to anyone who visits the site.
          </li>
          <li>
            <span className="text-term-bright">Email addresses</span> — one per member, used only
            to send calendar invitations for meetings. These are never shown publicly on the site.
          </li>
          <li>
            <span className="text-term-bright">Google account data</span> — when the organizer
            connects a Google account, the site stores a Google authorization token, the ID of the
            calendar event it creates for the club, and that event&apos;s meeting link.
          </li>
        </ul>
      </Section>

      <Section title="How Google data is used">
        <p>
          The site asks for one Google permission,{" "}
          <span className="text-term-bright">View and edit events on all your calendars</span>, and
          uses it for a single purpose: creating and updating the club&apos;s own meeting event on
          the organizer&apos;s calendar, and inviting members by email.
        </p>
        <p>
          It does not read, change or store any other events on that calendar, and it does not use
          Google data for advertising, for training machine learning or AI models, for credit
          decisions, or for sale to anyone.
        </p>
      </Section>

      <Section title="Who it&apos;s shared with">
        <p>
          Nobody. Information isn&apos;t transferred or disclosed to third parties, other than the
          services needed to run the site: Google (to create the calendar invitation), Supabase
          (which hosts the database) and Vercel (which hosts the site). Meeting invitations are
          visible to the club members invited to them.
        </p>
      </Section>

      <Section title="How it&apos;s protected">
        <p>
          The site is served over HTTPS, so traffic is encrypted in transit. The database sits
          behind row-level security and is only reachable by the site&apos;s own server code using a
          secret key. Email addresses and Google tokens are never sent to the browser and are
          excluded from the site&apos;s public backups.
        </p>
      </Section>

      <Section title="Keeping and deleting data">
        <p>
          Club records are kept as long as the club keeps using the site. Disconnecting Google in
          the site&apos;s settings deletes the stored Google token immediately, which ends the
          site&apos;s access to that calendar. You can also revoke it yourself at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-term-bright"
          >
            your Google Account permissions page
          </a>
          .
        </p>
        <p>
          Removing a member deletes their email address. To have your name or ratings removed as
          well, ask the organizer and it will be done.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes, the date at the top of the page changes with it.
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
