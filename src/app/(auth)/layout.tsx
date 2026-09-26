import Link from "next/link";
import { TimezoneSync } from "@/components/TimezoneSync";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <TimezoneSync />
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden /> Daily Thought
      </Link>
      <section className="card auth-card">{children}</section>
    </main>
  );
}
