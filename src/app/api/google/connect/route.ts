import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OAUTH_STATE_COOKIE, buildConsentUrl } from "@/lib/google";
import { isUnlocked } from "@/lib/session";

/**
 * Starts the Google consent flow. Edit mode is required: connecting a
 * calendar is a write, and anyone can hit this URL directly.
 */
export async function GET(request: Request) {
  if (!(await isUnlocked())) redirect("/login?returnTo=/settings");

  // Random value echoed back by Google and checked in the callback, so a
  // stray or forged callback can't attach someone else's account.
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
  });

  redirect(buildConsentUrl(new URL(request.url).origin, state));
}
