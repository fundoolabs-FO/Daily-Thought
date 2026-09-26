"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FRESH_LOGIN_COOKIE } from "@/lib/tz";

type Props = {
  userId: string;
  day: string;
  dayLabel: string;
  body: string;
  author: string | null;
};

/**
 * Full-screen pop-up with the thought of the day. Opens after each login
 * (a short-lived cookie set by the auth flow) and on the first visit of the day
 * on this device; can be reopened from the page.
 */
export function ThoughtModal({ userId, day, dayLabel, body, author }: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const seenKey = `dt:seen:${userId}`;

  useEffect(() => {
    const freshLogin = document.cookie.split("; ").includes(`${FRESH_LOGIN_COOKIE}=1`);
    let lastSeen: string | null = null;
    try {
      lastSeen = localStorage.getItem(seenKey);
    } catch {}

    if (freshLogin) document.cookie = `${FRESH_LOGIN_COOKIE}=; Path=/; Max-Age=0`;
    if (!freshLogin && lastSeen === day) return;

    try {
      localStorage.setItem(seenKey, day);
    } catch {}
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, [day, seenKey]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <button type="button" className="link-button" onClick={() => setOpen(true)}>
        View full screen
      </button>
      {open && (
        <div
          className="thought-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="thought-modal-label"
          aria-describedby="thought-modal-body"
        >
          <div className="thought-modal-inner">
            <p id="thought-modal-label" className="eyebrow">
              Your thought for {dayLabel}
            </p>
            <blockquote id="thought-modal-body" className="thought-modal-body">
              {body}
            </blockquote>
            {author && <p className="thought-author">{author}</p>}
            <button ref={closeRef} type="button" className="btn btn-light" onClick={close}>
              Begin my day
            </button>
          </div>
        </div>
      )}
    </>
  );
}
