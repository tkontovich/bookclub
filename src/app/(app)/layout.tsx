import { NavBar } from "@/components/NavBar";
import { MockSwitcher } from "@/components/mock/MockSwitcher";

// Every page here reads the session cookie and hits Supabase, so there's
// nothing worth prerendering - this also skips Next's speculative
// build-time prerender attempt (which would otherwise fail loudly without
// real Supabase credentials configured, even though the route still falls
// back to dynamic rendering correctly).
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {/* Full width so sections can run edge to edge; each page constrains
          its own content to max-w-3xl. */}
      <main className="w-full flex-1">{children}</main>
      <footer className="mx-auto w-full max-w-3xl p-4">
        <p className="rule">
          {"//"} LATER, NERDS {"-".repeat(120)}
        </p>
      </footer>
      <MockSwitcher />
    </>
  );
}
