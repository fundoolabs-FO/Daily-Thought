"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "dt:install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac with touch.
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/** Android/Chromium: custom install button. iOS Safari: "Add to Home Screen" hint. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (dismissed || isStandalone()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const timer = isIOS() ? window.setTimeout(() => setShowIOSHint(true), 1500) : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDeferred(null);
    setShowIOSHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (!deferred && !showIOSHint) return null;

  return (
    <aside className="install-banner" aria-label="Install app">
      <div>
        <strong>Install Daily Thought</strong>
        {deferred ? (
          <p className="small">Add it to your home screen for a calm start each day.</p>
        ) : (
          <p className="small">
            Tap{" "}
            <svg width="14" height="14" viewBox="0 0 24 24" aria-label="Share" className="inline-icon">
              <path fill="currentColor" d="M12 2 7.5 6.5l1.4 1.4L11 5.8V15h2V5.8l2.1 2.1 1.4-1.4zM5 10v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10h-2v10H7V10z" />
            </svg>{" "}
            <b>Share</b>, then <b>Add to Home Screen</b>.
          </p>
        )}
      </div>
      <div className="install-actions">
        {deferred && (
          <button type="button" className="btn btn-primary btn-sm" onClick={install}>
            Install
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss} aria-label="Dismiss">
          Not now
        </button>
      </div>
    </aside>
  );
}
