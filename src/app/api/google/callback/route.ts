import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  OAUTH_STATE_COOKIE,
  accessTokenFor,
  exchangeCodeForTokens,
  getPrimaryCalendar,
  loadCredentials,
  saveCredentials,
} from "@/lib/google";
import { isUnlocked } from "@/lib/session";

/** Where Google sends the browser back after the consent screen. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);

  if (!(await isUnlocked())) redirect("/login?returnTo=/settings");

  const denied = url.searchParams.get("error");
  if (denied) redirect(`/settings?google=denied`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !expectedState || state !== expectedState) {
    redirect("/settings?google=state");
  }

  // redirect() throws, so the success path can't live inside the try.
  let outcome = "connected";
  try {
    const tokens = await exchangeCodeForTokens(url.origin, code);

    // With prompt=consent Google returns a refresh token every time, but if
    // it ever doesn't, keep the one already stored rather than wiping it.
    const existing = await loadCredentials();
    const refreshToken = tokens.refresh_token ?? existing?.refresh_token;
    if (!refreshToken) throw new Error("Google didn't return a refresh token.");

    // The primary calendar's id doubles as a label for which account is
    // connected. Only shown when it actually looks like an address.
    let connectedEmail: string | null = null;
    try {
      const accessToken = await accessTokenFor(refreshToken);
      const calendar = await getPrimaryCalendar(accessToken);
      connectedEmail = calendar.id.includes("@") ? calendar.id : null;
    } catch {
      // Not worth failing the connection over a cosmetic label.
    }

    await saveCredentials({
      refresh_token: refreshToken,
      connected_email: connectedEmail,
      calendar_id: "primary",
    });
    revalidatePath("/settings");
    revalidatePath("/");
  } catch {
    outcome = "failed";
  }

  redirect(`/settings?google=${outcome}`);
}
