"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { FRESH_LOGIN_COOKIE } from "@/lib/tz";

export type FormState = { error?: string; message?: string };

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function markFreshLogin() {
  (await cookies()).set(FRESH_LOGIN_COOKIE, "1", {
    path: "/",
    maxAge: 300,
    sameSite: "lax",
    httpOnly: false, // read (and cleared) by the thought pop-up
  });
}

const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const email = field(fd, "email");
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  await markFreshLogin();
  redirect(safeNext(field(fd, "next")));
}

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const email = field(fd, "email");
  const password = String(fd.get("password") ?? "");
  if (!email) return { error: "Enter your email." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/today` },
  });
  if (error) return { error: error.message };

  // Email confirmation disabled in the project: the user is signed in right away.
  if (data.session) {
    await markFreshLogin();
    redirect("/today");
  }
  return { message: "Check your inbox for a confirmation link to finish signing up." };
}

export async function signInWithGoogle(fd: FormData) {
  const next = safeNext(String(fd.get("next") ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in failed")}`);
  }
  redirect(data.url);
}

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = field(fd, "email");
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return { message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  await markFreshLogin();
  redirect("/today");
}
