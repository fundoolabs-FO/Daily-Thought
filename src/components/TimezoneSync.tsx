"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TZ_COOKIE } from "@/lib/tz";

/**
 * Stores the browser's IANA timezone in a cookie so the server can compute the
 * user's local "today". Refreshes server data when the timezone changes.
 */
export function TimezoneSync({ refreshOnChange = false }: { refreshOnChange?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TZ_COOKIE}=`))
      ?.slice(TZ_COOKIE.length + 1);
    if (current && decodeURIComponent(current) === tz) return;

    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    if (refreshOnChange) router.refresh();
  }, [refreshOnChange, router]);

  return null;
}
