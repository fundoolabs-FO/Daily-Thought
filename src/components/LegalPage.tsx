import Link from "next/link";

export const CONTACT_EMAIL = "fo1@fundoolabs.in";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden /> Daily Thought
      </Link>
      <article className="card legal-body">
        <h1>{title}</h1>
        <p className="muted small">Last updated {updated}</p>
        {children}
      </article>
      <LegalLinks />
    </main>
  );
}

export function LegalLinks() {
  return (
    <nav className="legal-links small muted" aria-label="Legal">
      <Link href="/privacy">Privacy</Link>
      <span aria-hidden>·</span>
      <Link href="/terms">Terms</Link>
    </nav>
  );
}
