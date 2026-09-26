import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton, SignupForm } from "../forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1>Start a daily practice</h1>
      <p className="muted">One thought a day, and a moment to reflect on it.</p>
      <GoogleButton />
      <div className="divider">
        <span>or</span>
      </div>
      <SignupForm />
      <p className="muted small center">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}
