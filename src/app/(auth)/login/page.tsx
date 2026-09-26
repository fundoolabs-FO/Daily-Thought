import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton, LoginForm } from "../forms";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const target = safeNext(next);
  return (
    <>
      <h1>Welcome back</h1>
      <p className="muted">Sign in to see today&apos;s thought.</p>
      <GoogleButton next={target} />
      <div className="divider">
        <span>or</span>
      </div>
      <LoginForm next={target} initialError={error} />
      <p className="muted small center">
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </>
  );
}
