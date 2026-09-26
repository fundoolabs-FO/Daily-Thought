import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { FRESH_LOGIN_COOKIE } from "@/lib/tz";

// Handles OAuth (Google), email confirmation and password recovery links.
// Supports both the PKCE `code` flow and `token_hash` links from custom email templates.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  if (providerError) return fail(providerError);

  const supabase = await createClient();
  let error: { message: string } | null = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    return fail("That link is missing its code. Please try again.");
  }

  if (error) return fail(error.message);

  const response = NextResponse.redirect(`${origin}${next}`);
  if (!next.startsWith("/reset-password")) {
    response.cookies.set(FRESH_LOGIN_COOKIE, "1", { path: "/", maxAge: 300, sameSite: "lax" });
  }
  return response;
}
