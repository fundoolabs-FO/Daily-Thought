import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };
export const dynamic = "force-static";

// Precached by the service worker and shown when a page can't be fetched.
// Styles are inline so it renders even if the CSS bundle isn't cached.
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <p style={{ fontSize: 48, margin: 0 }} aria-hidden>
          ☁︎
        </p>
        <h1 style={{ fontSize: 24, margin: "12px 0 8px" }}>You&apos;re offline</h1>
        <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
          Today&apos;s thought will be here when you&apos;re back online. Pages you&apos;ve already
          opened are still available.
        </p>
        <a
          href="/today"
          style={{
            display: "inline-block",
            marginTop: 16,
            padding: "10px 18px",
            borderRadius: 999,
            background: "#2d3a5c",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          Try again
        </a>
      </div>
    </main>
  );
}
