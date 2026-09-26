"use client";

import { useState } from "react";

/** Clears service-worker caches (they may hold this user's pages) before signing out. */
export function SignOutButton() {
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    try {
      navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHES" });
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Never block sign-out on cache cleanup.
    }
    form.submit();
  };

  return (
    <form action="/auth/signout" method="post" onSubmit={onSubmit}>
      <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </form>
  );
}
