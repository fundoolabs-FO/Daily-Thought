import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "../forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1>Forgot your password?</h1>
      <p className="muted">We&apos;ll email you a link to choose a new one.</p>
      <ForgotForm />
      <p className="muted small center">
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}
