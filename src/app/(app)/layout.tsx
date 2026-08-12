import { NavBar } from "@/components/NavBar";

// Every page here reads the session/member cookies and hits Supabase, so
// there's nothing worth prerendering - this also skips Next's speculative
// build-time prerender attempt (which would otherwise fail loudly without
// real Supabase credentials configured, even though the route still falls
// back to dynamic rendering correctly).
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
    </>
  );
}
