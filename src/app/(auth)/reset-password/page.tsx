import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "../forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The recovery link signs the user in through /auth/callback before landing here.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect(`/login?error=${encodeURIComponent("Your reset link has expired. Please request a new one.")}`);
  }
  return (
    <>
      <h1>Choose a new password</h1>
      <p className="muted">You&apos;ll be signed in once it&apos;s saved.</p>
      <ResetForm />
    </>
  );
}
